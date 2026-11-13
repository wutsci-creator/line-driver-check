import { createHmac, timingSafeEqual } from 'node:crypto'

export function signed(raw: Buffer, signature: string | null, secret: string) {
  if (!signature || !secret) return false
  const expected = createHmac('sha256', secret).update(raw).digest('base64')
  const actual = Buffer.from(signature)
  return actual.length === expected.length && timingSafeEqual(actual, Buffer.from(expected))
}

export function validId(id: string) {
  if (!/^\d{13}$/.test(id)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i)
  return (11 - sum % 11) % 10 === Number(id[12])
}

const headers = ['เลขบัตร', 'ชื่อ', 'พื้นที่', 'ลูกค้า', 'วันลาออก', 'อายุงาน', 'สถานะ']

export function readIndex(rows: unknown): Set<string> {
  if (!Array.isArray(rows) || !Array.isArray(rows[0]) ||
      headers.some((name, i) => rows[0][i]?.toString().trim() !== name)) throw Error('sheet_header')
  const ids = new Set<string>()
  for (const row of rows.slice(1)) {
    if (!Array.isArray(row)) throw Error('sheet_row')
    if (row.every(cell => cell === '')) continue
    const id = String(row[0] ?? '').trim()
    if (!validId(id)) throw Error('sheet_id')
    ids.add(id)
  }
  if (!ids.size) throw Error('sheet_empty')
  return ids
}

