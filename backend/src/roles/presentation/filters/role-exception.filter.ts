/**
 * Role Exception Filter
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
  RoleNotFoundException,
  RoleNameAlreadyExistsException,
  AdminRoleCannotBeCreatedException,
  AdminRoleCannotBeModifiedException,
  AdminRoleCannotBeDeletedException,
  RoleHasAssignedUsersException,
} from '../../domain/exceptions/role-domain.exception';

@Catch()
export class RoleExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof RoleNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Role Not Found',
      });
    }

    if (exception instanceof RoleNameAlreadyExistsException) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        error: 'Role Name Already Exists',
      });
    }

    if (exception instanceof AdminRoleCannotBeCreatedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Admin Role Cannot Be Created',
      });
    }

    if (exception instanceof AdminRoleCannotBeModifiedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Admin Role Cannot Be Modified',
      });
    }

    if (exception instanceof AdminRoleCannotBeDeletedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Admin Role Cannot Be Deleted',
      });
    }

    if (exception instanceof RoleHasAssignedUsersException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Role Has Assigned Users',
      });
    }

    throw exception;
  }
}
