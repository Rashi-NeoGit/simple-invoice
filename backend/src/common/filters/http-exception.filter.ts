import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface StructuredErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Global exception filter so every endpoint returns the same
 * { statusCode, message, error } shape (spec §2.3.5 / §2.3.6), whether the
 * error comes from the ValidationPipe, a thrown HttpException, or an
 * unexpected runtime error.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const body: StructuredErrorBody =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as StructuredErrorBody)
          : { statusCode: status, message: String(exceptionResponse), error: exception.name };

      response.status(status).json(body);
      return;
    }

    // eslint-disable-next-line no-console
    console.error('Unhandled exception:', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}
