export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
  service?: string; // Which microservice threw the error
}

export class ServiceError extends Error {
  constructor(
    public statusCode: number,
    public service: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
