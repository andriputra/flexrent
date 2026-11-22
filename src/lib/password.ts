import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

// Sandi disimpan sebagai scrypt (sudah ada di Node, jadi tidak perlu dependensi
// native yang sering bermasalah saat build). Format string menyimpan parameternya
// supaya parameter bisa dinaikkan nanti tanpa merusak hash lama.
//   scrypt$N$r$p$<gaji hex>$<hash hex>

const ALGORITHM = "scrypt"
const KEY_LENGTH = 64
const COST = 16384 // 2^14 — ~16 MB kerja per percobaan, cukup untuk menahan brute force.
const BLOCK_SIZE = 8
const PARALLELISM = 1

export const MIN_PASSWORD_LENGTH = 8

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallelism: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelism, maxmem: 128 * cost * blockSize * 2 },
      (error, key) => (error ? reject(error) : resolve(key))
    )
  })
}

/** Pesan error bila sandi terlalu lemah; `null` bila cukup. */
export function passwordWeakness(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }
  if (!/[a-zA-Z0-9]/.test(password)) return "Sandi harus mengandung huruf atau angka."
  return null
}

// Sandi awal untuk akun yang dibuatkan operator: hanya dibaca sekali lalu
// diteruskan lewat WA/telepon, jadi alfabetnya tanpa karakter yang mudah
// tertukar (0/O, 1/I/L) dan dikelompokkan per empat karakter.
const HANDOVER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const HANDOVER_LENGTH = 12

export function generateHandoverPassword(): string {
  const chars = Array.from(randomBytes(HANDOVER_LENGTH), (byte) => HANDOVER_ALPHABET[byte % HANDOVER_ALPHABET.length])
  return chars.join("").replace(/(.{4})(?=.)/g, "$1-")
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM)
  return [ALGORITHM, COST, BLOCK_SIZE, PARALLELISM, salt.toString("hex"), hash.toString("hex")].join("$")
}

/**
 * Membandingkan sandi dengan hash tersimpan. Hash yang bentuknya tidak dikenal
 * dianggap tidak cocok — jangan pernah login tanpa verifikasi.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== ALGORITHM) return false
  const [, costText, blockSizeText, parallelismText, saltText, hashText] = parts
  const cost = Number(costText)
  const blockSize = Number(blockSizeText)
  const parallelism = Number(parallelismText)
  if (!Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelism)) return false
  try {
    const salt = Buffer.from(saltText, "hex")
    const expected = Buffer.from(hashText, "hex")
    const actual = await derive(password, salt, cost, blockSize, parallelism)
    return expected.length === actual.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
