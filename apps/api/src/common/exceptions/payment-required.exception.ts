import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(message: string, extra?: Record<string, unknown>) {
    super(
      { message, statusCode: HttpStatus.PAYMENT_REQUIRED, ...extra },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
