import { CreateUploadMediaInput } from './create-upload-media.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateUploadMediaInput extends PartialType(CreateUploadMediaInput) {

}
