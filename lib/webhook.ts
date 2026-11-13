import { signed, validId } from './check.ts'

export const messages = {
  denied: 'บัญชีนี้ไม่มีสิทธิ์ตรวจสอบ',
  invalid: 'กรุณาส่งเลข 13 หลักติดกัน และตรวจสอบว่าพิมพ์ถูกต้อง',
  found: 'พบรายการในทะเบียน กรุณาให้เจ้าหน้าที่ตรวจสอบก่อนพิจารณารับสมัคร',
  absent: 'ไม่พบรายการในทะเบียนที่ตรวจสอบ กรุณาดำเนินการตามขั้นตอนรับสมัคร',
  unavailable: 'ระบบตรวจสอบไม่ได้ กรุณาพักการพิจารณาและลองใหม่ภายหลัง',
}

type Event = {
  type?: string, mode?: string, webhookEventId?: string, replyToken?: string,
  source?: { type?: string, userId?: string }, message?: { type?: string, text?: string }
}
type Services = {
  secret: string, allowed: Set<string>, load: () => Promise<Set<string>>,
  reply: (token: string, message: string) => Promise<void>,
  log: (code: string) => void
}

// Successful replies are remembered locally. LINE enforces single use across instances.
export function createHandler() {
  const completed = new Map<string, number>()
  const active = new Map<string, Promise<void>>()
  return async function handle(raw: Buffer, signature: string | null, svc: Services) {
    if (!signed(raw, signature, svc.secret)) return 401
    let events: Event[]
    try {
      events = JSON.parse(raw.toString('utf8')).events
      if (!Array.isArray(events)) return 400
    } catch { return 400 }

    let snapshot: Promise<Set<string>> | undefined
    async function processEvent(event: Event) {
      if (!event || typeof event !== 'object') throw Error('event')
      if (event.mode === 'standby' || event.type !== 'message' ||
          event.source?.type !== 'user' || event.message?.type !== 'text') return
      const { webhookEventId: key, replyToken } = event
      if (typeof key !== 'string' || !key || typeof replyToken !== 'string' || !replyToken) throw Error('event')
      if ((completed.get(key) ?? 0) > Date.now()) return
      const pending = active.get(key)
      if (pending) return pending

      async function respond(token: string) {
        let result: keyof typeof messages = 'denied'
        if (event.source?.userId && svc.allowed.has(event.source.userId)) {
          const id = event.message?.text?.trim() ?? ''
          result = 'invalid'
          if (validId(id)) {
            try {
              snapshot ??= svc.load()
              result = (await snapshot).has(id) ? 'found' : 'absent'
            } catch (error) {
              result = 'unavailable'
              const known = ['configuration', 'google_auth', 'sheet_range', 'sheet_access',
                'sheet_file', 'sheet_quota', 'google_read', 'sheet_header', 'sheet_row', 'sheet_id', 'sheet_empty']
              const code = error instanceof Error && known.includes(error.message) ? error.message : 'sheet_unavailable'
              svc.log(code)
            }
          }
        }
        await svc.reply(token, messages[result])
        svc.log('reply_ok')
      }
      const task = respond(replyToken)
      active.set(key, task)
      try {
        await task
        if (completed.size >= 5000) completed.delete(completed.keys().next().value!)
        completed.set(key, Date.now() + 86400000)
      } finally { active.delete(key) }
    }
    let failed = false
    for (let offset = 0; offset < events.length; offset += 8) {
      const outcomes = await Promise.allSettled(events.slice(offset, offset + 8).map(processEvent))
      if (outcomes.some(item => item.status === 'rejected')) failed = true
    }
    if (failed) svc.log('event_or_reply_failed')
    return failed ? 503 : 200
  }
}

