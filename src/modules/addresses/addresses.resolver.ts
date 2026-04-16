import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AddressesService } from './addresses.service';
import { Address } from './entities/address.entity';
import { UpdateAddressInput } from './dto/update-address.input';

@Resolver(() => Address)
export class AddressesResolver {
  constructor(private readonly addressesService: AddressesService) {}


  @Mutation(() => Address, {name: 'updateAddressForUser'})
  async updateAddress(
    @Args('userId') userId: string,
    @Args('updateAddressInput') updateAddressInput: UpdateAddressInput,
  ) {
    return this.addressesService.update(userId, updateAddressInput);
  }

}
