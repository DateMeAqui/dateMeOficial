import { GalleryResolver } from './gallery.resolver';

describe('GalleryResolver', () => {
  let resolver: GalleryResolver;
  let media: any;

  beforeEach(() => {
    media = {
      addGalleryPhoto: jest.fn().mockResolvedValue({ id: 'p1' }),
      removeGalleryPhoto: jest.fn().mockResolvedValue(undefined),
      listGalleryPhotos: jest.fn().mockResolvedValue([{ id: 'p1' }]),
    };
    resolver = new GalleryResolver(media);
  });

  it('addGalleryPhoto chama service com me.id', async () => {
    const out = await resolver.addGalleryPhoto('m1', { id: 'u1' } as any);
    expect(media.addGalleryPhoto).toHaveBeenCalledWith('m1', 'u1');
    expect(out.id).toBe('p1');
  });

  it('removeGalleryPhoto retorna true', async () => {
    const out = await resolver.removeGalleryPhoto('p1', { id: 'u1' } as any);
    expect(media.removeGalleryPhoto).toHaveBeenCalledWith('p1', 'u1');
    expect(out).toBe(true);
  });

  it('myGalleryPhotos retorna lista', async () => {
    const out = await resolver.myGalleryPhotos({ id: 'u1' } as any);
    expect(out).toEqual([{ id: 'p1' }]);
  });
});
