import { ExecutionContext } from '@nestjs/common';
import { extractCurrentUserFromRest } from './current-user-rest.decorator';

describe('extractCurrentUserFromRest', () => {
  it('retorna req.user do contexto HTTP', () => {
    const fakeUser = { id: 'u1', email: 'a@b.com' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: fakeUser }) }),
    } as unknown as ExecutionContext;

    expect(extractCurrentUserFromRest(undefined, ctx)).toBe(fakeUser);
  });

  it('retorna undefined se req.user não existir', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(extractCurrentUserFromRest(undefined, ctx)).toBeUndefined();
  });
});
