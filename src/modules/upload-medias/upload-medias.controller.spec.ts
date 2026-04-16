import { Test, TestingModule } from '@nestjs/testing';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasService } from './upload-medias.service';

describe('UploadMediasController', () => {
  let controller: UploadMediasController;
  let service: UploadMediasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadMediasController],
      providers: [
        {
          provide: UploadMediasService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UploadMediasController>(UploadMediasController);
    service = module.get<UploadMediasService>(UploadMediasService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should upload a single file', async () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 4,
    } as Express.Multer.File;

    const mockResult = '/uploads/test-uuid.jpg';
    jest.spyOn(service, 'uploadFile').mockResolvedValue(mockResult);

    const result = await controller.uploadSingleFile(mockFile, { isVideo: false });

    expect(result).toEqual({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: mockResult,
    });
    expect(service.uploadFile).toHaveBeenCalledWith(mockFile, false);
  });

  it('should throw error when no file provided', async () => {
    await expect(
      controller.uploadSingleFile(null, { isVideo: false }),
    ).rejects.toThrow('No file provided');
  });
});

