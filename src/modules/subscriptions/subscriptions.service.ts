import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { UpdateSubscriptionInput } from './dto/update-subscription.input';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateDateBrazilNow } from 'src/utils/calculate_date_brazil_now';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private calculateBrazilDate: CalculateDateBrazilNow
  ){}

  async create(createSubscriptionInput: CreateSubscriptionInput) {

    this.checkingValiableCreateNewSubscription(createSubscriptionInput.userId!)

    if(!createSubscriptionInput.interval){
      throw new BadRequestException('The "interval" field is required!')
    }
    
    const timeInterval = await this.calculateIntervalSubscription(createSubscriptionInput.interval)
    const startDate = this.calculateBrazilDate.brazilDate()
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + timeInterval)
    const trialEnd = new Date(startDate)
    trialEnd.setDate(startDate.getDate() + 7)
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { id: createSubscriptionInput.planId }
    })
    const amount = createSubscriptionInput.amount ?? (Math.trunc(timeInterval / 30) * plan.price);

    const newSubscription = await this.prisma.subscription.create({
      data:{
        startDate,
        endDate,
        userId: createSubscriptionInput.userId!,
        planId: createSubscriptionInput.planId,
        statusId: createSubscriptionInput.statusId,
        isActive: true,
        autoRenew: createSubscriptionInput.autoRenew,
        discount: createSubscriptionInput.discount,
        interval: createSubscriptionInput.interval,
        amount,
        trialEnd
      }
    })

    return newSubscription;
  }

  // findAll() {
  //   const startDate = this.calculateBrazilDate.brazilDate()
 
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} subscription`;
  // }

  // update(id: number, updateSubscriptionInput: UpdateSubscriptionInput) {
  //   return `This action updates a #${id} subscription`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} subscription`;
  // }

  private async calculateIntervalSubscription(interval: string):Promise<number>{
      if(interval === 'MONTH') return 30;
      if(interval === 'YEAR') return 365;
      
      throw new BadRequestException(`Invalid interval: ${interval}`);
  }

  private async checkAmountSubscription(interval: string):Promise<number>{
      if(interval === 'MONTH') return 30;
      if(interval === 'YEAR') return 365;
      
      throw new BadRequestException(`Invalid interval: ${interval}`);
  }

  private async checkingValiableCreateNewSubscription(userId: string){
    //verificando se user tem subscription Ativa
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        isActive: true, // apenas ativa
        status: {
          slug: {
            in: ['active', 'incomplete', 'trialing', 'pastDue'], // filtro no relacionamento
          },
        },
      },
      include: {
        status: true, // traz a tabela SubscriptionStatus
      },
    });
  

    if(subscriptions){
      const size = subscriptions.length
      let msg = ""
      for ( const sub of subscriptions){
        if(sub.status.slug === 'trialing'){
          await this.prisma.subscription.update({where:{id:sub.id}, data:{isActive:false, statusId:3}})
        }
        msg += `${sub.id} - ${sub.status.slug}, `;
      }
      if (msg) {
        throw new BadRequestException(`Erro: usuário contém ${size} subscriptions ativas: ${msg}`);
      }
    } 
  }
}
