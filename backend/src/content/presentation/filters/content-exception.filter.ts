/**
 * Content Exception Filter
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ContentNotFoundException,
  ContentAlreadyPublishedException,
} from '../../domain/exceptions/content-domain.exception';

@Catch()
export class ContentExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ContentNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Content Not Found',
      });
    }

    if (exception instanceof ContentAlreadyPublishedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Content Already Published',
      });
    }

    throw exception;
  }
}
