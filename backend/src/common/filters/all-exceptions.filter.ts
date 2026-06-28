import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // body-parser gibi Nest dışı hatalar HttpException değildir; status'ü elle yakala
    const maybeAny = exception as any;
    const maybeStatus =
      typeof maybeAny?.status === 'number'
        ? maybeAny.status
        : typeof maybeAny?.statusCode === 'number'
          ? maybeAny.statusCode
          : undefined;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : maybeStatus || HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Validation hatalarını daha detaylı göster
    let message: string | string[] = 'Internal server error';
    if (exception instanceof BadRequestException) {
      const response = exceptionResponse as any;
      if (Array.isArray(response.message)) {
        message = response.message;
      } else if (typeof response.message === 'string') {
        message = response.message;
      } else if (response.message) {
        message = response.message;
      }
    } else if (maybeAny?.type === 'entity.too.large' || status === 413) {
      message = 'Payload too large';
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Log the full error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception:', exception);
    }

    response.status(status).json(errorResponse);
  }
}
