import { Injectable } from '@nestjs/common';
import { CreateSubscriptionStatusInput } from './dto/create-subscription-status.input';
import { UpdateSubscriptionStatusInput } from './dto/update-subscription-status.input';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionStatusService {
  constructor(
    private prisma: PrismaService
  ){}
  async createSubscriptionStatus(createSubscriptionStatusInput: CreateSubscriptionStatusInput) {
    return await this.prisma.subscriptionStatus.create({data: createSubscriptionStatusInput});
  }

  async findAllSubscriptionStatus() {
    return await this.prisma.subscriptionStatus.findMany();
  }

  async findSubscriptionStatusByName(slug: string) {
    return await this.prisma.subscriptionStatus.findFirstOrThrow({
      where:{slug}
    });
  }

  async updateSubscriptionStatus(id: number, updateSubscriptionStatusInput: UpdateSubscriptionStatusInput) {
    try{
      await this.prisma.subscriptionStatus.findUniqueOrThrow({
        where:{
          id
        }
      });

      const subscriptionStatusUpdated = await this.prisma.subscriptionStatus.update({
        where:{id},
        data: updateSubscriptionStatusInput
      });

      return subscriptionStatusUpdated;
    } catch (err) {
      throw err
    }
  }

  async removeSubscriptionStatus(id: number) {
    return await this.prisma.subscriptionStatus.delete({where:{id}})
  }
}
