/** Payload formulir selalu string; field yang tidak ada dianggap kosong. */
export function textOf(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}
