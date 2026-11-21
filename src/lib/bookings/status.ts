import type { BookingStatus, VehicleStatus } from "@prisma/client"

/** Aksi staf pada pesanan. Nama aksinya stabil, status tujuan dihitung dari sini. */
export type StatusAction = "CONFIRM" | "START" | "COMPLETE" | "CANCEL"

const RESULT_STATUS: Record<StatusAction, BookingStatus> = {
  CONFIRM: "CONFIRMED",
  START: "ONGOING",
  COMPLETE: "COMPLETED",
  CANCEL: "CANCELLED",
}

const ALLOWED_FROM: Record<StatusAction, BookingStatus[]> = {
  CONFIRM: ["PENDING"],
  START: ["CONFIRMED"],
  COMPLETE: ["ONGOING"],
  CANCEL: ["PENDING", "CONFIRMED"],
}

export const ACTION_LABEL: Record<StatusAction, string> = {
  CONFIRM: "Konfirmasi",
  START: "Mulai sewa",
  COMPLETE: "Selesai",
  CANCEL: "Batalkan",
}

export const ACTION_REQUIREMENT: Record<StatusAction, string> = {
  CONFIRM: "Hanya pesanan berstatus menunggu konfirmasi yang bisa dikonfirmasi.",
  START: "Sewa bisa dimulai setelah pesanan dikonfirmasi.",
  COMPLETE: "Pengembalian hanya bisa dicatat untuk sewa yang sedang berjalan.",
  CANCEL: "Pesanan yang sedang berjalan atau sudah selesai tidak bisa dibatalkan.",
}

const ACTION_ORDER: StatusAction[] = ["CONFIRM", "START", "COMPLETE", "CANCEL"]

export function isStatusAction(value: string): value is StatusAction {
  return (ACTION_ORDER as string[]).includes(value)
}

export function statusAfterAction(action: StatusAction): BookingStatus {
  return RESULT_STATUS[action]
}

export function isActionAllowed(action: StatusAction, status: BookingStatus): boolean {
  return ALLOWED_FROM[action].includes(status)
}

/** Tombol aksi yang muncul di panel detail maupun menu baris tabel. */
export function allowedActions(status: BookingStatus): StatusAction[] {
  return ACTION_ORDER.filter((action) => isActionAllowed(action, status))
}

export function actionRejection(action: StatusAction): string {
  return ACTION_REQUIREMENT[action]
}

/**
 * Status kendaraan setelah aksi. `null` = armada tidak ikut berubah.
 * COMPLETED mengembalikan kendaraan ke AVAILABLE, tapi pemanggil yang memutuskan
 * apakah itu menimpa status MAINTENANCE.
 */
export function vehicleStatusAfterAction(action: StatusAction): VehicleStatus | null {
  if (action === "START") return "RENTED"
  if (action === "COMPLETE") return "AVAILABLE"
  return null
}
