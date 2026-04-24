import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { CalculateDateBrazilNow } from '../../utils/calculate_date_brazil_now';
import { ProfileService } from '../profile/profile.service';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: UsersService;
  let prismaMock: jest.Mocked<PrismaService>

  beforeEach(async () => {
    prismaMock = {
      user: {
        create: jest.fn()
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SmsService, useValue: { sendSms: jest.fn() } },
        { provide: CalculateDateBrazilNow, useValue: { brazilDate: () => new Date() } },
        { provide: ProfileService, useValue: { createForUser: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
      ]
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('CreateUser', () => {
    it('deveria criar um user', async () => {
      const input ={
          name: "diovane",
          email: "diovan3e@gmail.com",
          password: "234",
          birthdate: "1986-07-22",
          cpf: "00000000000",
          smartphone: "53991127424",
      };
      const fakeUser = {
          id: '1f128a08-5c8d-4155-9109-e8a8f4f3fa45',
          name: input.name,
          email: input.email,
          password: 'hashed_password',
          birthdate: new Date(input.birthdate),
          cpf: input.cpf,
          smartphone: input.smartphone,
          createdAt: new Date(),
          verificationCode: 1234,
          status: 'ativo',
          isOnline: false,

      };

      jest.spyOn(usersService, 'create').mockResolvedValue(fakeUser);

      const result = await resolver.CreateUser(input as any)

      expect(usersService.create).toHaveBeenCalledWith(input)
      expect(result).toEqual(fakeUser)
    });
  });
});
