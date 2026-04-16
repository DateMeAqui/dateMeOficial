import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client'

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: jest.Mocked<PrismaService>

  beforeEach(async () => {
    prismaMock = {
      user:{
        create: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
 

    const module: TestingModule = await Test.createTestingModule({
        providers:[UsersService,
          {provide: PrismaService, useValue: prismaMock},
        ],
    }).compile()
    service = module.get<UsersService>(UsersService)
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  describe('create', () => {
    it('deveria criar um user com senha hashada', async () => {
      const input ={
          fullName: "diovane",
          nickName: "diovane",
          email: "diovan3e@gmail.com",
          password: "234",
          birthdate: "1986-07-22",
          cpf: "00000000000",
          smartphone: "53991127424",
      };
      const fakeUser = {
          id: '1f128a08-5c8d-4155-9109-e8a8f4f3fa45',
          fullName: input.fullName,
          nickName: input.nickName,
          email: input.email,
          password: 'hashed_password',
          birthdate: new Date(input.birthdate),
          cpf: input.cpf,
          smartphone: input.smartphone,
          createdAt: new Date(),
          verificationCode: 1234,
      };
      (prismaMock.user.create as jest.Mock).mockResolvedValueOnce(fakeUser);
      
      const result = await service.create(input as any)

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: input.fullName,
            nickName: input.nickName,
            email: input.email,
            password: expect.any(String), // senha tem que estar hash
            verificationCode: expect.any(Number),
            createdAt: expect.any(Date),
          }),
        }),
      );
      expect(result).toEqual(fakeUser)
    });
  });

  describe('create falha', () =>{
    it('deveria lançar erro se falhar ao criar usuário', async () => {
      const input = {
        fullName: "diovane",
        nickName: "diovane",
        email: "diovane@gmail.com",
        password: "234",
        birthdate: "1986-07-22",
        cpf: "00000000000",
        smartphone: "53991127424",
      };

      const fakeError = new Error('Erro ao criar usuário');

      (prismaMock.user.create as jest.Mock).mockRejectedValueOnce(fakeError);

      await expect(service.create(input as any)).rejects.toThrow('Erro ao criar usuário');

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Object)
        }),
      );
    });
  });

  describe('create email duplicado', () => {
    it('deveria lançar um erro se o email já existir', async () => {
      const input = {
        fullName: "diovane",
        nickName: "diovane",
        email: "diovane@gmail.com",
        password: "234",
        birthdate: "1986-07-22",
        cpf: "00000000000",
        smartphone: "53991127424",
      };

      const duplicateEmailError = new  Prisma.PrismaClientKnownRequestError(
        'Unique cosntraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '6.15.0'
        }
      );

      (prismaMock.user.create as jest.Mock).mockRejectedValueOnce(duplicateEmailError);

      await expect(service.create(input as any)).rejects.toThrow('Já existe um usuário com esse e-mail ou cpf');

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Object),
        })
      );

    });
  });

});
