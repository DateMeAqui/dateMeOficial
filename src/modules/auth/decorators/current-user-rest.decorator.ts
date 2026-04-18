import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const extractCurrentUserFromRest = (
  _: unknown,
  context: ExecutionContext,
) => context.switchToHttp().getRequest().user;

export const CurrentUserRest = createParamDecorator(extractCurrentUserFromRest);
