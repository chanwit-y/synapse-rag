export function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function toIdString(id: number): string {
  return String(id);
}

export function toIsoString(date: Date): string {
  return date.toISOString();
}

export function maskKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "••••";
  const tail = trimmed.slice(-4);
  return `•••••••••••••••••••••${tail}`;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function assertFound<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value == null) {
    throw new ServiceError(message, "NOT_FOUND");
  }
  return value;
}
