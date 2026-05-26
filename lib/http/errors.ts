export class AppRouteError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "APP_ROUTE_ERROR", details?: unknown) {
    super(message);
    this.name = "AppRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppRouteError(error: unknown): error is AppRouteError {
  return error instanceof AppRouteError;
}

export function badRequest(message: string, details?: unknown) {
  return new AppRouteError(400, message, "BAD_REQUEST", details);
}

export function unauthorized(message = "Unauthorized", details?: unknown) {
  return new AppRouteError(401, message, "UNAUTHORIZED", details);
}

export function forbidden(message = "Forbidden", details?: unknown) {
  return new AppRouteError(403, message, "FORBIDDEN", details);
}

export function notFound(message = "Not found", details?: unknown) {
  return new AppRouteError(404, message, "NOT_FOUND", details);
}

export function conflict(message = "Conflict", details?: unknown) {
  return new AppRouteError(409, message, "CONFLICT", details);
}
