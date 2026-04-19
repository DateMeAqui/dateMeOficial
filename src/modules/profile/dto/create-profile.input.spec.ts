import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProfileInput } from './create-profile.input';
import { Gender } from '../enums/gender.enum';

describe('CreateProfileInput validation', () => {
  const base = { gender: Gender.MAN, preferences: [Gender.WOMAN] };

  async function run(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateProfileInput, payload);
    return validate(dto);
  }

  it('accepts a minimal valid input (no bio)', async () => {
    const errors = await run(base);
    expect(errors).toHaveLength(0);
  });

  it('rejects empty preferences array', async () => {
    const errors = await run({ ...base, preferences: [] });
    expect(errors.some((e) => e.property === 'preferences')).toBe(true);
  });

  it('rejects bio longer than 500 characters', async () => {
    const errors = await run({ ...base, bio: 'a'.repeat(501) });
    expect(errors.some((e) => e.property === 'bio')).toBe(true);
  });

  it('accepts bio exactly at 500 characters', async () => {
    const errors = await run({ ...base, bio: 'a'.repeat(500) });
    expect(errors).toHaveLength(0);
  });

  it('rejects gender not in the enum', async () => {
    const errors = await run({ ...base, gender: 'OTHER' as unknown as Gender });
    expect(errors.some((e) => e.property === 'gender')).toBe(true);
  });

  it('rejects preferences with invalid enum member', async () => {
    const errors = await run({ ...base, preferences: ['BOGUS'] as unknown as Gender[] });
    expect(errors.some((e) => e.property === 'preferences')).toBe(true);
  });
});
