import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.48.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.trim().length === 0) {
    throw new AppError("not_configured", 503);
  }
  return value.trim();
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  return jsonResponse({ error: "internal_error" }, 500);
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function createAdminClient(): SupabaseClient {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireUser(request: Request): Promise<{ user: User; client: SupabaseClient }> {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new AppError("authentication_required", 401);
  }
  const client = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new AppError("authentication_required", 401);
  }
  return { user: data.user, client };
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError("json_required", 415);
  }
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid_body");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new AppError("invalid_request", 400);
  }
}

export function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function requiredString(value: unknown, code = "invalid_request"): string {
  const result = optionalString(value);
  if (!result) {
    throw new AppError(code, 400);
  }
  return result;
}

export function uuid(value: unknown, code = "invalid_request"): string {
  const result = requiredString(value, code);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new AppError(code, 400);
  }
  return result;
}

export function firstRow<T>(data: T | T[] | null): T {
  if (Array.isArray(data)) {
    if (!data[0]) {
      throw new AppError("not_found", 404);
    }
    return data[0];
  }
  if (data === null) {
    throw new AppError("not_found", 404);
  }
  return data;
}

