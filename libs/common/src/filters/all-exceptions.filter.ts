import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * 全局异常过滤器：统一错误响应结构，避免泄露堆栈。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message?: string }).message ?? res;
    } else if (exception instanceof QueryFailedError) {
      const driverError = (
        exception as QueryFailedError & { driverError?: { code?: string } }
      ).driverError;
      if (driverError?.code === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        message = mapDuplicateEntryMessage(exception.message);
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function mapDuplicateEntryMessage(rawMessage: string): string {
  const match = rawMessage.match(/Duplicate entry '([^']+)'/);
  const value = match?.[1];
  if (value?.includes('@')) {
    return '该邮箱已被注册';
  }
  if (value && /^\+?[0-9]{6,20}$/.test(value)) {
    return '该手机号已被注册';
  }
  return '数据已存在，请勿重复提交';
}
