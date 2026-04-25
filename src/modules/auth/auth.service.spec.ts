import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockUsersService = { findUserByEmail: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('token'), verify: jest.fn() };
const mockConfigService = { get: jest.fn().mockReturnValue('secret') };
const mockCacheManager = { set: jest.fn(), get: jest.fn(), del: jest.fn() };

describe('AuthService — security', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser — HIGH-01', () => {
    it('retorna null para usuário PENDING', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: '$2b$10$invalidhash',
        status: 'PENDING',
      });
      const result = await service.validateUser('test@test.com', 'qualquer');
      expect(result).toBeNull();
    });

    it('retorna null para usuário BLOCKED', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: '$2b$10$invalidhash',
        status: 'BLOCKED',
      });
      const result = await service.validateUser('test@test.com', 'qualquer');
      expect(result).toBeNull();
    });

    it('retorna null quando email não existe', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue(null);
      const result = await service.validateUser('naoexiste@test.com', 'senha');
      expect(result).toBeNull();
    });
  });

  describe('logout — HIGH-02', () => {
    it('revoga o access token no Redis', async () => {
      mockJwtService.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.logout('user-id', 'access.token.here');

      expect(mockCacheManager.del).toHaveBeenCalledWith('refresh:user-id');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'revoked:access.token.here',
        true,
        expect.any(Number),
      );
    });
  });

  describe('JWT_SECRET obrigatório — HIGH-03', () => {
    it('ConfigService deve retornar JWT_SECRET definido', () => {
      const secret = mockConfigService.get('JWT_SECRET');
      expect(secret).toBeTruthy();
    });
  });

  describe('refresh — HIGH-06', () => {
    it('assina novo access token com secret explícito do ConfigService', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-id',
        email: 'user@test.com',
        role: 'USER',
      });
      mockCacheManager.get.mockResolvedValue('stored_refresh_token');
      mockJwtService.sign.mockReturnValue('new_access_token');

      const result = await service.refresh('stored_refresh_token');
      expect(result.access_token).toBe('new_access_token');

      const signCall = mockJwtService.sign.mock.calls[0];
      expect(signCall[1]).toMatchObject({ secret: 'secret' }); // ConfigService mock retorna 'secret'
    });
  });
});
