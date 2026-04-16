import { Test, TestingModule } from '@nestjs/testing';
import { UploadMediasService } from './upload-medias.service';

describe('UploadMediasService', () => {
  let service: UploadMediasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadMediasService],
    }).compile();

    service = module.get<UploadMediasService>(UploadMediasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
