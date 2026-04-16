import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UploadMediasService } from './upload-medias.service';
import { UploadMedia } from './entities/upload-media.entity';
import { CreateUploadMediaInput } from './dto/create-upload-media.input';
import { UpdateUploadMediaInput } from './dto/update-upload-media.input';

@Resolver(() => UploadMedia)
export class UploadMediasResolver {
  constructor(private readonly uploadMediasService: UploadMediasService) {}

  // Note: GraphQL file upload functionality is temporarily disabled due to graphql-upload package compatibility issues
  // Use the REST API endpoints instead:
  // POST /upload-medias/single - for single file upload
  // POST /upload-medias/multiple - for multiple file upload
}
