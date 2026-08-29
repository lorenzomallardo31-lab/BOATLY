type LogValue = string | number | boolean | null | undefined;

export function logServerEvent(
  level: "info" | "warn" | "error",
  event: string,
  context: Record<string, LogValue> = {},
) {
  const entry = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
