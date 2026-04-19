import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SmsService } from '../sms/sms.service';
import { CalculateDateBrazilNow } from '../../utils/calculate_date_brazil_now';
import { ProfileService } from '../profile/profile.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;
  let profileServiceMock: { createForUser: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      profile: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prismaMock)),
    };

    profileServiceMock = {
      createForUser: jest.fn().mockResolvedValue({ id: 'p1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SmsService, useValue: { sendSms: jest.fn() } },
        { provide: CalculateDateBrazilNow, useValue: { brazilDate: () => new Date('2026-04-18T12:00:00Z') } },
        { provide: ProfileService, useValue: profileServiceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const baseInput = {
    fullName: 'diovane',
    nickName: 'diovane',
    email: 'diovan3e@gmail.com',
    password: '234',
    birthdate: '1986-07-22',
    cpf: '00000000000',
    smartphone: '53991127424',
    address: { street: 'rua A', number: 1, district: 'x', city: 'y', state: 'z', cep: '00000000' },
    roleId: 3,
    profile: { gender: 'MAN', preferences: ['WOMAN'] },
  };

  describe('create', () => {
    it('deveria criar um user com senha hashada', async () => {
      const fakeUser = {
        id: '1f128a08-5c8d-4155-9109-e8a8f4f3fa45',
        fullName: baseInput.fullName,
        nickName: baseInput.nickName,
        email: baseInput.email,
        password: 'hashed_password',
        birthdate: new Date(baseInput.birthdate),
        cpf: baseInput.cpf,
        smartphone: baseInput.smartphone,
        createdAt: new Date(),
        verificationCode: 1234,
      };
      (prismaMock.user.create as jest.Mock).mockResolvedValueOnce(fakeUser);

      const result = await service.create(baseInput as any);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: baseInput.fullName,
            email: baseInput.email,
            password: expect.any(String),
            verificationCode: expect.any(Number),
            createdAt: expect.any(Date),
          }),
        }),
      );
      expect(profileServiceMock.createForUser).toHaveBeenCalledWith(
        fakeUser.id,
        baseInput.profile,
        prismaMock,
      );
      expect(result).toEqual(fakeUser);
    });
  });

  describe('create falha', () => {
    it('deveria lançar erro se falhar ao criar usuário', async () => {
      (prismaMock.user.create as jest.Mock).mockRejectedValueOnce(new Error('Erro ao criar usuário'));

      await expect(service.create(baseInput as any)).rejects.toThrow('Erro ao criar usuário');
    });
  });

  describe('create email duplicado', () => {
    it('deveria lançar um erro se o email já existir', async () => {
      const duplicateEmailError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '6.15.0' },
      );

      (prismaMock.user.create as jest.Mock).mockRejectedValueOnce(duplicateEmailError);

      await expect(service.create(baseInput as any)).rejects.toThrow('Já existe um usuário com esse e-mail ou cpf');
    });
  });

  describe('atomic profile creation', () => {
    it('rolls back user creation if profile creation fails', async () => {
      (prismaMock.user.create as jest.Mock).mockResolvedValueOnce({ id: 'u1' });
      profileServiceMock.createForUser.mockRejectedValueOnce(new Error('profile failed'));

      await expect(service.create(baseInput as any)).rejects.toThrow('Erro ao criar usuário');
      expect(profileServiceMock.createForUser).toHaveBeenCalledTimes(1);
    });
  });
});

