import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@koridor/shared';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = HttpStatus[status] ?? code;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message =
          (typeof obj.message === 'string'
            ? obj.message
            : Array.isArray(obj.message)
              ? obj.message.join('; ')
              : message) || message;
        code =
          (typeof obj.error === 'string' ? obj.error : undefined) ??
          HttpStatus[status] ??
          code;
        details = obj.details ?? (Array.isArray(obj.message) ? obj.message : undefined);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unhandled exception', String(exception));
    }

    const payload: ApiError = {
      success: false,
      error: {
        code: code.toUpperCase().replace(/\s+/g, '_'),
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(status).json(payload);
  }
}
