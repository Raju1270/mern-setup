export interface FieldError {
  field: string;
  message: string;
}

// CUSTOM ERROR CLASS. `errorHandler` DERIVES THE "fail"/"error" ENVELOPE STATUS FROM statusCode.
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: FieldError[];

  constructor(message: string, statusCode: number, errors?: FieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
