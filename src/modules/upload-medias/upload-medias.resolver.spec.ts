import { Test, TestingModule } from '@nestjs/testing';
import { UploadMediasResolver } from './upload-medias.resolver';
import { UploadMediasService } from './upload-medias.service';

describe('UploadMediasResolver', () => {
  let resolver: UploadMediasResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadMediasResolver, UploadMediasService],
    }).compile();

    resolver = module.get<UploadMediasResolver>(UploadMediasResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
