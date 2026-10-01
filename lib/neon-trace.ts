import { randomUUID } from "crypto";

type NeonTraceValue = string | number | boolean | null | readonly string[];
type NeonTraceMetadata = { source: string; model: string; operation: string; [key: string]: NeonTraceValue };

function resultCount(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  if (value === null) return 0;
  if (typeof value === "object") return 1;
  return undefined;
}

export async function traceNeonRead<T>(metadata: NeonTraceMetadata, read: () => Promise<T>): Promise<T> {
  if (process.env.NEON_TRACE !== "1") return read();
  const operationId = randomUUID();
  const startedAt = performance.now();
  try {
    const result = await read();
    console.info("[NEON_TRACE]", JSON.stringify({ phase: "END", operation_id: operationId, ...metadata, status: "ok", result_count: resultCount(result), duration_ms: Math.round(performance.now() - startedAt) }));
    return result;
  } catch (error) {
    console.info("[NEON_TRACE]", JSON.stringify({ phase: "END", operation_id: operationId, ...metadata, status: "error", error_name: error instanceof Error ? error.name : "UnknownError", duration_ms: Math.round(performance.now() - startedAt) }));
    throw error;
  }
}
