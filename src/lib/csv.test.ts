import { describe, expect, it } from "vitest"
import { csvFilename, csvRow, toCsv } from "./csv"

describe("csv", () => {
  it("membungkus kutip hanya saat sel mengandung pemisah atau kutip", () => {
    expect(csvRow(["B 1234 ABC", "Honda Vario, 150", 'ukuran "150"'])).toBe(
      "B 1234 ABC,\"Honda Vario, 150\",\"ukuran \"\"150\"\"\""
    )
    expect(csvRow(["a", 150000, null, undefined])).toBe("a,150000,,")
  })

  it("diawali BOM dan dipisah CRLF supaya rapi di Excel", () => {
    const csv = toCsv([["Plat", "Total"], ["B1", 1]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe("Plat,Total\r\nB1,1\r\n")
  })

  it("nama file hanya berisi karakter aman", () => {
    expect(csvFilename("Pendapatan 01—11 2026")).toBe("pendapatan-01-11-2026.csv")
    expect(csvFilename("###")).toBe("laporan.csv")
  })
})
