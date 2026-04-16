import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanInput, CreatePlanNameInput } from './dto/create-plan.input';
import { UpdatePlanInput } from './dto/update-plan.input';

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService
  ){}
  async createPlan(createPlanInput: CreatePlanInput) {
    try{
      const plan = await this.prisma.plan.create({
        data:createPlanInput
      })
      return plan
    } catch (err) {
      throw err;
    }
  }

  async findAllPlan() {
    return await this.prisma.plan.findMany();
  }

  async findByName(namePlan: CreatePlanNameInput) {
    return await this.prisma.plan.findFirstOrThrow({
      where:{
        name: namePlan.name
      }
    });
  }

  async updatePlan(id: string, updatePlanInput: UpdatePlanInput) {
    try{
      const plan = await this.prisma.plan.findUniqueOrThrow({
        where:{
          id
        }
      });

      const planUpdated = await this.prisma.plan.update({
        where:{id},
        data: updatePlanInput
      });

      return planUpdated;
    } catch (err) {
      throw err
    }
  }

  async removePlan(id: string) {
    return await this.prisma.plan.delete({where:{id}})
  }
}
