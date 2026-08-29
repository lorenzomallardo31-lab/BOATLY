import { logServerEvent } from "@/lib/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logServerEvent("info", "application_started", {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    });
  }
}
