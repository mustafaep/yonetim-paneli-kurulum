/**
 * Profession Exception Filter
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ProfessionNotFoundException,
  ProfessionNameAlreadyExistsException,
  ProfessionInUseException,
} from '../../domain/exceptions/profession-domain.exception';

@Catch()
export class ProfessionExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ProfessionNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Profession Not Found',
      });
    }

    if (exception instanceof ProfessionNameAlreadyExistsException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Profession Name Already Exists',
      });
    }

    if (exception instanceof ProfessionInUseException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Profession In Use',
      });
    }

    throw exception;
  }
}
