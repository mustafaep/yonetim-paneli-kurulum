/**
 * Member Group Exception Filter
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  MemberGroupNotFoundException,
  MemberGroupNameAlreadyExistsException,
  MemberGroupInUseException,
  MemberGroupAlreadyAtTopException,
  MemberGroupAlreadyAtBottomException,
} from '../../domain/exceptions/member-group-domain.exception';

@Catch()
export class MemberGroupExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof MemberGroupNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Member Group Not Found',
      });
    }

    if (exception instanceof MemberGroupNameAlreadyExistsException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Group Name Already Exists',
      });
    }

    if (exception instanceof MemberGroupInUseException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Group In Use',
      });
    }

    if (exception instanceof MemberGroupAlreadyAtTopException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Group Already At Top',
      });
    }

    if (exception instanceof MemberGroupAlreadyAtBottomException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Group Already At Bottom',
      });
    }

    throw exception;
  }
}
