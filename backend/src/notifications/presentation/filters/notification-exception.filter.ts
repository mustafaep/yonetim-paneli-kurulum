/**
 * Notification Exception Filter
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  NotificationNotFoundException,
  NotificationCannotBeSentException,
  InvalidNotificationTargetException,
} from '../../domain/exceptions/notification-domain.exception';

@Catch()
export class NotificationExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof NotificationNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Notification Not Found',
      });
    }

    if (exception instanceof NotificationCannotBeSentException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Notification Cannot Be Sent',
      });
    }

    if (exception instanceof InvalidNotificationTargetException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Invalid Notification Target',
      });
    }

    throw exception;
  }
}
