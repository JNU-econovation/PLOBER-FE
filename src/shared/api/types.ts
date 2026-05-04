export type ApiResponse<T> = {
  data: T;
};

type ApiErrorOptions = {
  status?: number;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}
