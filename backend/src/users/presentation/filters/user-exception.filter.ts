/**
 * User Exception Filter
 *
 * Maps domain exceptions to HTTP responses.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  UserNotFoundException,
  UserEmailAlreadyExistsException,
  UserMemberAlreadyLinkedException,
  UserMemberRequiredException,
  UserScopeRequiredException,
  UserInvalidScopeException,
} from '../../domain/exceptions/user-domain.exception';

@Catch()
export class UserExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof UserNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'User Not Found',
      });
    }

    if (exception instanceof UserEmailAlreadyExistsException) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        error: 'Email Already Exists',
      });
    }

    if (exception instanceof UserMemberAlreadyLinkedException) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        error: 'Member Already Linked',
      });
    }

    if (exception instanceof UserMemberRequiredException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Required',
      });
    }

    if (exception instanceof UserScopeRequiredException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Scope Required',
      });
    }

    if (exception instanceof UserInvalidScopeException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Invalid Scope',
      });
    }

    throw exception;
  }
}
