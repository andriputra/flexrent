import type { z } from "zod"

export type FieldErrors = Record<string, string>

export type ActionCode =
  | "VALIDATION"
  | "PLAN_LIMIT"
  | "READ_ONLY"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHENTICATED"
  | "UNKNOWN"

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionCode; fields?: FieldErrors }

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}

export function fail(
  error: string,
  options: { code?: ActionCode; fields?: FieldErrors } = {}
): { ok: false; error: string; code?: ActionCode; fields?: FieldErrors } {
  return { ok: false, error, code: options.code, fields: options.fields }
}

/** Next melempar error dengan digest untuk redirect — jangan sampai tertelan catch. */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  )
}

/** Membungkus try/catch server action supaya error tak bocor sebagai 500. */
export async function safeAction<T>(
  run: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await run()
  } catch (error) {
    console.error("[action]", error)
    return fail("Terjadi kesalahan di server. Coba lagi sebentar.", { code: "UNKNOWN" })
  }
}

const GENERIC_MESSAGES: Partial<Record<string, string>> = {
  invalid_type: "{label} harus diisi",
  invalid_union: "{label} tidak sesuai format",
  too_small: "{label} terlalu pendek",
  too_big: "{label} terlalu panjang",
}

/** Mengubah ZodError menjadi peta pesan per nama field. */
export function fieldErrorsFromZod(
  error: z.ZodError,
  labels?: Record<string, string>
): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".")
    if (!path || result[path]) continue
    const fallback = GENERIC_MESSAGES[issue.code]
    result[path] = issue.message ?? (fallback ?? "{label} tidak valid").replace(
      "{label}",
      labels?.[path] ?? "Isian"
    )
  }
  return result
}
