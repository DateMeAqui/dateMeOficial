import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { Photo } from './entities/photo.entity';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Photo)
@UseGuards(GqlAuthGuard)
export class GalleryResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Mutation(() => Photo, { name: 'addGalleryPhoto' })
  addGalleryPhoto(
    @Args('mediaId', { type: () => ID }) mediaId: string,
    @CurrentUser() me,
  ) {
    return this.mediaService.addGalleryPhoto(mediaId, me.id);
  }

  @Mutation(() => Boolean, { name: 'removeGalleryPhoto' })
  async removeGalleryPhoto(
    @Args('photoId', { type: () => ID }) photoId: string,
    @CurrentUser() me,
  ) {
    await this.mediaService.removeGalleryPhoto(photoId, me.id);
    return true;
  }

  @Query(() => [Photo], { name: 'myGalleryPhotos' })
  myGalleryPhotos(@CurrentUser() me) {
    return this.mediaService.listGalleryPhotos(me.id);
  }
}
