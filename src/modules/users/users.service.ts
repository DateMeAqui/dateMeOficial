import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { PrismaService } from '../prisma/prisma.service';
import { User, UsersWithPagination, UserWithAge } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { SmsService } from '../sms/sms.service';
import { StatusUser } from './enums/status_user.enum';
import { Cron } from '@nestjs/schedule';
import { SearchUserInput } from './dto/search-user.input';
import { CalculateDateBrazilNow } from '../../utils/calculate_date_brazil_now'
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class UsersService {

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private calculateDateBrazilNow: CalculateDateBrazilNow,
    private profileService: ProfileService,
  ){}

  async create(createUserInput: CreateUserInput): Promise<User>{

    const hashedPassord = await bcrypt.hash(createUserInput.password, 10)

    const verificationCode = Math.floor(1000 + Math.random() * 9000);
    this.sms.sendSms(createUserInput.smartphone, verificationCode)

    const brazilDate = this.calculateDateBrazilNow.brazilDate()

    const birthdate = new Date(createUserInput.birthdate);

    const { address, profile, ...userData} = createUserInput;
    try {
      const createData: any = {
        ...userData,
        birthdate: birthdate,
        createdAt: brazilDate,
        password: hashedPassord,
        verificationCode: verificationCode,
        roleId: Number(createUserInput.roleId)
      }

      const newUser = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            ...createData,
            address: {
              create: address,
            }
          },
          include:{
            address: true,
            role: true
          }
        })

        await this.profileService.createForUser(user.id, profile, tx);

        return user;
      });
      return newUser;
    } catch (error: any) {
      if(error.code === 'P2002'){
        throw new Error("Já existe um usuário com esse e-mail ou cpf");
      }
      throw new Error('Erro ao criar usuário');
    }
  }

  async findAllUsers() {
    const users =  await this.prisma.user.findMany({
      include:{
        address: true,
        role: true
      }
    });
    return users.map(user => this.toUserWithAge(user));
  }

  async findAllUsersPagination(
    page: number = 1,
    limit: number = 10,
    searchTerm?: string,
  ){
    //calcula o skip para paginação
    const skip = (page - 1) * limit;

    // Construir condições de busca
    const where: any = { 
      deletedAt: null ,
      status: 'ACTIVE'
    }


    if(searchTerm){
      where.OR = [
        {fullName: { contains: searchTerm, mode: 'insensitive'}},
        {nickName: { contains: searchTerm, mode: 'insensitive'}},
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      include:{
        address: true,
        role: true
      }
    });

    const total = await this.prisma.user.count({where});

    const totalPages = Math.ceil(total / limit)

    return{
      users: users.map(user => this.toUserWithAge(user)),
      total,
      page,
      limit,
      totalPages
    }
  }

  async findUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId
      },
      include:{
        address: true,
        role: true
      }
    })
    return this.toUserWithAge(user)
  }

  async searchByFilter(searchInput: SearchUserInput): Promise<UsersWithPagination | null>{

    const { 
      searchTerm, 
      limit = 10, 
      page = 1,
    } = searchInput;

    const where: any  = { deletedAt: null, };
    
    if(searchTerm){
      where.OR = [
        {fullName: { contains: searchTerm, mode: 'insensitive'}},
        {nickName: { contains: searchTerm, mode: 'insensitive'}},
      ];
    }

    const skip = (page - 1) * limit
    const take = limit;

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        address: true,
        role: true
      }
    });

    const total = await this.prisma.user.count({where});

    const totalPages = Math.ceil(total / limit)

    return {
        users: users.map(user => this.toUserWithAge(user)),
        limit,
        page,
        total,
        totalPages
    }
  }

  async updateUser(userId: string, updateData: UpdateUserInput, me: any){
    console.log(`Attempting to update user with ID: ${userId}`);

    const user = await this.prisma.user.findUniqueOrThrow({
      where:{
        id: userId
      },
      include:{
        address: true
      }
    })

    if (user.id !== me.id && me.roleId === 1) {
      throw new Error("You do not have permission to update user!")
    }

    if(updateData.password){
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (updateData.status === 'PENDING' && user.status !== "PENDING"){
      updateData.status = user.status as StatusUser
    }

    const {address, profile: _profile, ...userData} = updateData
    try{
      const userUpdated =  await this.prisma.user.update({
        where:{ id: userId},
        data: userData,
        include:{
          address: true
        }
      });

      if(address){
        await this.prisma.address.update({
          where:{ id: user.address?.id},
          data:address
        })
      }

      return userUpdated;

    }catch(error){
      throw new Error(`Failed to update user role ${error.message}`);
    }
  }

  async deleteUser(userId: string): Promise<User>{
    return await this.prisma.user.delete({
      where:{
        id: userId
      },
      include: {
        address: true,
        role: true
      }
    })
  }

  async softDelete(userId: string, me: any): Promise<User | null> {

    const user = await this.prisma.user.findFirstOrThrow({
      where:{
        id: userId
      }
    });

    if (user.id !== me.id && me.roleId === 3) {
      throw new Error("You do not have permission to update user!")
    }

    const now = new Date();
    const brazilDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    if(user.deletedAt === null){
      return this.prisma.user.update({
        where:{
          id:userId
        },
        data:{
          deletedAt: brazilDate,
          status: StatusUser.INACTIVE,
        },
        include: {
          address: true,
          role: true
        }
      })
    }
    return null;
  }

  // Validando codigo do usuario e ativando status
  async activeStatusWithVerificationCode(userId: string, verificationCode: number){
    const user = await this.prisma.user.findUniqueOrThrow({
      where:{
        id: userId
      }
    });

    if(user.verificationCode !== verificationCode){
      throw new Error("Code the verification invalid!");
    }

    const updateUser = await this.prisma.user.update({
      where:{
        id: userId
      },
      data: {status: StatusUser.ACTIVE}
    })
    
    return updateUser;
  }

  //Método para calcular a idade
  private calculateAge(birthdateUser: Date): number {
    const today = new Date();
    const birthdate = new Date(birthdateUser);
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();

    if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())){
      age--
    }
    return age;
  }

  //Metodo para converter User para UserWithAge
  private toUserWithAge(user: User): UserWithAge{
    return {
      ...user,
      age: this.calculateAge(user.birthdate),
      role: user.role || null 
    };
  }

  //cron que deve rodar uma vez por dia a 00:00hs e remover user com o deletedAt com a data que esteja fazendo 30 dias 
  @Cron('0 0 0 * * *') // todos os dias às 00:00:00
  private async deletingUserOlderThan30Days(){
    const brazilDate = this.calculateDateBrazilNow.brazilDate()

    const limitDate = new Date(brazilDate)
    limitDate.setDate(limitDate.getDate() - 30)

    const usersToDelete = await this.prisma.user.findMany({
      where:{
        deletedAt:{
          lte: limitDate
        }
      }
    });

    if(usersToDelete.length > 0){
      const ids = usersToDelete.map(user => user.id)

      await this.prisma.user.deleteMany({
        where:{
          id: {in: ids}
        }
      })
    }
  }
}