import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { LoginInput } from './dto/login.input';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ){}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService['prisma'].user.findUniqueOrThrow({
      where: { email },
      include: { 
        address: true,
        role: true
      }
    })

    if( user && await bcrypt.compare(password, user.password)) {
      await this.usersService['prisma'].user.update({ 
        where:{ id: user.id},
        data:{
          lastLogin: new Date() 
        }
      });
      const { password, ...result } = user;
      return result
    }
    return null;
  }

  async login( loginInput: LoginInput ) {

    const user = await this.validateUser(loginInput.email, loginInput.password) 
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { sub:user.id, email: user.email, role: typeof user.role === 'string' ? user.role : user.role.name,};

    //access token curto
    const accessToken = this.jwtService.sign(payload, { 
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    //refrest token mais longo
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '60m',
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    //salvar refrash no Redis (opcional: amarrar ao user)
    await this.cacheManager.set(
      `refresh:${user.id}`,
      refreshToken, 
      1 * 60 * 60, // 1hora 3600
    );

    return { 
      access_token: accessToken,
      refreshToken: refreshToken, 
      user, 
    };
  }

  async refresh(refreshToken: string) {
    try {
      //verifica se é válido
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      //opcional: confere se está no Redis
      const stored = await this.cacheManager.get(`refresh:${payload.sub}`);
      if(stored !== refreshToken){
        throw new UnauthorizedException('Invalid refresh token');
      }

      //gera novo access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email
        },
        {
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
        }
      );
      return {
        access_token: newAccessToken
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async revokeToken(token: string, expiresInSeconds = 3600): Promise<void> {
    // salva o token revogado no Redis com expiração
    await this.cacheManager.set(`revoked:${token}`, true, expiresInSeconds);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const revoked = await this.cacheManager.get(`revoked:${token}`);
    return !!revoked
  }

  async validateToken(token: string) {
    if (await this.isTokenRevoked(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const payload = this.jwtService.verify(token)
      const user = await this.usersService['prisma'].user.findUniqueOrThrow(payload.sub)

      if (!user) throw new UnauthorizedException('User not found');

      return user;
    } catch(error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async logout(userId: string): Promise<boolean> {
    try{
      await this.cacheManager.del(`refresh:${userId}`)
      return true;
    } catch(error){
      throw new ExceptionsHandler(error)
      return false;
    }
  }
  
}
