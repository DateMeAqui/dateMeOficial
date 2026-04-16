import { Injectable } from '@nestjs/common';
import { UpdateAddressInput } from './dto/update-address.input';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressesService {

  constructor(
    private prisma: PrismaService
  ){}
  async update(userId: string, updateAddressInput: UpdateAddressInput) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where:{
          id: userId,
        },
        include:{
          address: true
        }
      });
      console.log(user)
      const addressId = user.address?.id

      const addressUpdate = this.prisma.address.update({
        where:{id: addressId},
        data: updateAddressInput
      })
    return addressUpdate
  }

}
