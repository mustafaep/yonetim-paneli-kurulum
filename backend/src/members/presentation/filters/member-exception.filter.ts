/**
 * Member Exception Filter
 *
 * Presentation Layer: Domain exception'ları HTTP exception'a çevirir
 *
 * Sorumluluklar:
 * - Domain exception'ları yakalama
 * - HTTP status code mapping
 * - User-friendly error messages
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
  MemberCannotBeApprovedException,
  MemberApprovalMissingFieldsException,
  MemberCannotBeActivatedException,
  MemberActivationMissingFieldsException,
  MemberCannotBeRejectedException,
  MemberCannotBeCancelledException,
  MemberCancellationReasonRequiredException,
  MemberNotFoundException,
} from '../../domain/exceptions/member-domain.exception';

@Catch()
export class MemberExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Domain exception'ları HTTP exception'a çevir
    if (exception instanceof MemberCannotBeApprovedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Cannot Be Approved',
      });
    }

    if (exception instanceof MemberApprovalMissingFieldsException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        missingFields: exception.missingFields,
        error: 'Member Approval Missing Fields',
      });
    }

    if (exception instanceof MemberCannotBeActivatedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Cannot Be Activated',
      });
    }

    if (exception instanceof MemberActivationMissingFieldsException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        missingFields: exception.missingFields,
        error: 'Member Activation Missing Fields',
      });
    }

    if (exception instanceof MemberCannotBeRejectedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Cannot Be Rejected',
      });
    }

    if (exception instanceof MemberCannotBeCancelledException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Cannot Be Cancelled',
      });
    }

    if (exception instanceof MemberCancellationReasonRequiredException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Member Cancellation Reason Required',
      });
    }

    if (exception instanceof MemberNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Member Not Found',
      });
    }

    // Diğer exception'lar için default handling
    if (exception instanceof BadRequestException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Bad Request',
      });
    }

    if (exception instanceof NotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Not Found',
      });
    }

    // Unknown exception
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}
