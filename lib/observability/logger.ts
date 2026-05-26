type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  event: string;
  message: string;
  category: "auth" | "authorization" | "mutation";
  meta?: Record<string, unknown>;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, payload: LogPayload) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };

  const serialized = JSON.stringify(record, (_key, value) => {
    if (value instanceof Error) {
      return normalizeError(value);
    }

    return value;
  });

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(payload: LogPayload) {
  writeLog("info", payload);
}

export function logWarn(payload: LogPayload) {
  writeLog("warn", payload);
}

export function logError(payload: LogPayload) {
  writeLog("error", payload);
}

export function errorMeta(error: unknown) {
  return {
    error: normalizeError(error),
  };
}
