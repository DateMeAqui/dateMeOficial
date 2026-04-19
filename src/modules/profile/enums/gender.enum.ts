import { registerEnumType } from '@nestjs/graphql';

export enum Gender {
  WOMAN = 'WOMAN',
  TRANS_WOMAN = 'TRANS_WOMAN',
  MAN = 'MAN',
  TRANS_MAN = 'TRANS_MAN',
  COUPLE_HE_SHE = 'COUPLE_HE_SHE',
  COUPLE_HE_HE = 'COUPLE_HE_HE',
  COUPLE_SHE_SHE = 'COUPLE_SHE_SHE',
  GAY = 'GAY',
  LESBIAN = 'LESBIAN',
  TRAVESTI = 'TRAVESTI',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: 'Gender/orientation values used for profile identification and partner preferences',
});
