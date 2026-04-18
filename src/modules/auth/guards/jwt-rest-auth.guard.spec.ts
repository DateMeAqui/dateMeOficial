import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtRestAuthGuard } from './jwt-rest-auth.guard';

describe('JwtRestAuthGuard', () => {
  let guard: JwtRestAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new JwtRestAuthGuard(reflector);
  });

  it('deixa passar quando rota é @Public()', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('getRequest devolve o Request HTTP padrão (não usa GqlExecutionContext)', () => {
    const fakeReq = { headers: { authorization: 'Bearer x' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => fakeReq }),
    } as unknown as ExecutionContext;
    expect(guard.getRequest(ctx)).toBe(fakeReq);
  });
});
