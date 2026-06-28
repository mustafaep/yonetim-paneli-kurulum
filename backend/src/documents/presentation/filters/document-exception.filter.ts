/**
 * Document Exception Filter
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DocumentTemplateNotFoundException,
  MemberDocumentNotFoundException,
  DocumentCannotBeApprovedException,
  DocumentCannotBeRejectedException,
  DocumentNotApprovedException,
} from '../../domain/exceptions/document-domain.exception';

@Catch()
export class DocumentExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DocumentTemplateNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Document Template Not Found',
      });
    }

    if (exception instanceof MemberDocumentNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Member Document Not Found',
      });
    }

    if (exception instanceof DocumentCannotBeApprovedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Document Cannot Be Approved',
      });
    }

    if (exception instanceof DocumentCannotBeRejectedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Document Cannot Be Rejected',
      });
    }

    if (exception instanceof DocumentNotApprovedException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Document Not Approved',
      });
    }

    throw exception;
  }
}
