import { createHandler } from '../../../../lib/webhook.ts'
import { loadIds, reply, required } from '../../../../lib/services.ts'

export const runtime = 'nodejs'
export const maxDuration = 60
const handle = createHandler()

export async function POST(request: Request) {
  let status = 503
  try {
    const raw = Buffer.from(await request.arrayBuffer())
    status = await handle(raw, request.headers.get('x-line-signature'), {
      secret: required('LINE_CHANNEL_SECRET'),
      allowed: new Set((process.env.LINE_ALLOWED_USER_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean)),
      load: loadIds, reply, log: code => console.info(code),
    })
  } catch { console.error('webhook_unavailable') }
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })
}

