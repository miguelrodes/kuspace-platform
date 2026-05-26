import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { badRequest, isAppRouteError } from "@/lib/http/errors";
import type { ApiErrorPayload } from "@/lib/http/contracts";

type RouteHandlerOptions = {
  successStatus?: 200 | 201;
};

function sanitizeErrorDetails(details: unknown) {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return undefined;
  }
}

function buildErrorPayload(
  status: number,
  message: string,
  code: string,
  details?: unknown,
): ApiErrorPayload {
  return {
    ok: false,
    error: {
      message,
      code,
      status,
      details,
    },
  };
}

export async function withRouteHandler<T>(
  handler: () => Promise<T | Response>,
  options?: RouteHandlerOptions,
) {
  try {
    const result = await handler();
    return result instanceof Response
      ? result
      : NextResponse.json(result, { status: options?.successStatus ?? 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        buildErrorPayload(
          400,
          "Validation failed",
          "VALIDATION_ERROR",
          sanitizeErrorDetails(error.flatten()),
        ),
        { status: 400 },
      );
    }

    if (isAppRouteError(error)) {
      return NextResponse.json(
        buildErrorPayload(
          error.status,
          error.message,
          error.code,
          sanitizeErrorDetails(error.details),
        ),
        { status: error.status },
      );
    }

    console.error("Unhandled route error", error);
    return NextResponse.json(
      buildErrorPayload(500, "Internal server error", "INTERNAL_SERVER_ERROR"),
      { status: 500 },
    );
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    throw badRequest("Invalid JSON body", error);
  }

  return schema.parse(body);
}

export async function parseOptionalJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T | null> {
  const contentLength = request.headers.get("content-length");

  if (!contentLength || contentLength === "0") {
    return null;
  }

  return parseJsonBody(request, schema);
}

export async function parseRouteParams<T>(
  paramsPromise: Promise<unknown>,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await paramsPromise);
}
