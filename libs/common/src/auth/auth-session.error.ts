import { UnauthorizedException } from '@nestjs/common';

/** 会话/访问令牌失效（过期、吊销、被管理员踢下线）— 前端据此提示并跳转登录 */
export const AUTH_SESSION_TERMINATED = 'AUTH_SESSION_TERMINATED';

export function createAuthSessionTerminatedException(
  message: string,
): UnauthorizedException {
  return new UnauthorizedException({
    message,
    errorCode: AUTH_SESSION_TERMINATED,
  });
}
