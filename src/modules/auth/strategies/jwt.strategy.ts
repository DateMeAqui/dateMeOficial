import { ForbiddenException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "src/modules/users/users.service";
import { AuthService } from "../auth.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService,
        private authService: AuthService,
    ){
        // Detectar se estamos no modo de geração (--generate-only)
        const isGenerateMode = process.argv.includes('--generate-only') || process.env.MOCK_PRISMA === 'true';
        const jwtSecret = isGenerateMode
            ? 'documentation_generation_secret_key'
            : configService.get<string>('JWT_SECRET') || 'fallback-secret-key';

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
            passReqToCallback: true,
        });
    }

    async validate(request: any, payload: JwtPayload) {
        //Se estiver no modo de geração de documentação, retornar um usúario ficticio
        if(process.argv.includes('--generate-only') || process.env.MOCK_PRISMA === 'true') {
            return {
                id: 'doc-user-id',
                email: 'doc@example.com',
                fullName: 'Documentation User',
            };
        }

        //Extrair token do cabeçalho Authorization
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

        //Se não houver token, retornar error 
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        //verificar se o token foi revogado (await faltando)
        const isRevoked = await this.authService.isTokenRevoked(token);
        if(isRevoked) {
            throw new UnauthorizedException('Token has been revoked');
        }

        //Verificar se o usuário existe 
        const user = await this.usersService.findUserById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.status !== 'ACTIVE') {
            throw new ForbiddenException('Account not active. Please verify your code.');
        }

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}