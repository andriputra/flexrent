import { toast } from "sonner"
import type { ActionResult } from "@/lib/result"

/** Menampilkan toast dari hasil server action dan mengembalikan status sukses. */
export function notifyResult<T>(result: ActionResult<T>, successMessage: string): boolean {
  if (result.ok) {
    toast.success(successMessage)
    return true
  }
  toast.error(result.error)
  return false
}
