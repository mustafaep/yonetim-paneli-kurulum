/**
 * Region Exception Filter
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
  ProvinceNotFoundException,
  DistrictNotFoundException,
  BranchNotFoundException,
  InstitutionNotFoundException,
  UserScopeNotFoundException,
  DistrictProvinceMismatchException,
  DuplicateUserScopeException,
  InvalidScopeException,
  LastBranchCannotBeDeletedException,
} from '../../domain/exceptions/region-domain.exception';

@Catch()
export class RegionExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ProvinceNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Province Not Found',
      });
    }

    if (exception instanceof DistrictNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'District Not Found',
      });
    }

    if (exception instanceof BranchNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Branch Not Found',
      });
    }

    if (exception instanceof InstitutionNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Institution Not Found',
      });
    }

    if (exception instanceof UserScopeNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'User Scope Not Found',
      });
    }

    if (exception instanceof DistrictProvinceMismatchException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'District Province Mismatch',
      });
    }

    if (exception instanceof DuplicateUserScopeException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Duplicate User Scope',
      });
    }

    if (exception instanceof InvalidScopeException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Invalid Scope',
      });
    }

    if (exception instanceof LastBranchCannotBeDeletedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Last Branch Cannot Be Deleted',
      });
    }

    throw exception;
  }
}
