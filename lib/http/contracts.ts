export type ApiErrorPayload = {
  ok: false;
  error: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
  };
};

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const error = candidate.error;

  if (candidate.ok !== false || !error || typeof error !== "object") {
    return false;
  }

  const nextError = error as Record<string, unknown>;

  return (
    typeof nextError.message === "string" &&
    typeof nextError.code === "string" &&
    typeof nextError.status === "number"
  );
}
