const buckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  status = 429;
}

export function enforceRateLimit(
  request: Request,
  key: string,
  options: { limit: number; windowMs: number },
) {
  const ip = getClientIp(request);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (bucket.count >= options.limit) {
    throw new RateLimitError("Too many requests. Please wait and try again.");
  }

  bucket.count += 1;
}

export function rejectBotSubmission(input: Record<string, unknown>) {
  if (typeof input.website === "string" && input.website.trim()) {
    throw new Error("Submission rejected.");
  }
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function statusForError(error: unknown, fallback = 400) {
  if (error instanceof RateLimitError) {
    return error.status;
  }

  if (error instanceof Error && error.message === "Unauthorized") {
    return 401;
  }

  if (
    error instanceof Error &&
    (error.message.includes("Production storage") ||
      error.message.includes("STRIPE_SECRET_KEY"))
  ) {
    return 503;
  }

  return fallback;
}
