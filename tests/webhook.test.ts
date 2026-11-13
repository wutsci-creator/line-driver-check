import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readIndex, validId } from '../lib/check.ts'
import { createHandler, messages } from '../lib/webhook.ts'

// Invented arithmetic fixture with leading zeros. Never copied from a person.
const id = '0'.repeat(11) + '19'
const header = ['เลขบัตร', 'ชื่อ', 'พื้นที่', 'ลูกค้า', 'วันลาออก', 'อายุงาน', 'สถานะ']
const secret = 'unit-test-only'
function event(key: string, text = id, userId = 'allowed') {
  return { webhookEventId: key, type: 'message', source: { type: 'user', userId },
    message: { type: 'text', text }, replyToken: 'test-' + key }
}
function fixture() {
  const sent: string[] = []
  const logs: string[] = []
  const service = { secret, allowed: new Set(['allowed']),
    load: async () => new Set([id]),
    reply: async (_token: string, message: string) => { sent.push(message) },
    log: (code: string) => { logs.push(code) } }
  const handle = createHandler()
  function send(events: unknown[], bad = false) {
    const raw = Buffer.from(JSON.stringify({ events }))
    const sig = createHmac('sha256', secret).update(raw).digest('base64')
    return handle(raw, bad ? sig.replace(/^./, c => c === 'a' ? 'b' : 'a') : sig, service)
  }
  return { sent, logs, service, send }
}
test('checksum including leading zeros', () => {
  assert.ok(validId(id))
  for (const bad of [id.slice(1), id.slice(0, -1) + '8', 'a' + id.slice(1)]) assert.ok(!validId(bad))
})
test('complete sheet required before absence', () => {
  assert.ok(readIndex([header, [id]]).has(id))
  for (const rows of [undefined, [], [header], [['wrong'], [id]], [header, [id], ['', 'name']], [header, ['#REF!']]]) {
    assert.throws(() => readIndex(rows))
  }
})
test('signed verification, denied users, invalid input and group isolation', async () => {
  const f = fixture()
  f.service.load = async () => { throw Error('unexpected') }
  assert.equal(await f.send([]), 200)
  assert.equal(await f.send([event('x')], true), 401)
  assert.equal(await f.send([event('a', id, 'outsider'), event('b', 'short'),
    { ...event('c'), source: { type: 'group', userId: 'allowed' } }]), 200)
  assert.deepEqual(f.sent, [messages.denied, messages.invalid])
})
test('batch checks once and coalesces duplicates', async () => {
  const f = fixture()
  let reads = 0
  f.service.load = async () => { reads++; return new Set([id]) }
  const events = [event('one'), event('two', '0'.repeat(12) + '1'), event('one')]
  assert.equal(await f.send(events), 200)
  assert.equal(await f.send(events), 200)
  assert.equal(reads, 1)
  assert.deepEqual(f.sent, [messages.found, messages.absent])
})
test('sheet failure produces only unavailable and safe log codes', async () => {
  const f = fixture()
  f.service.load = async () => { throw Error(id) }
  assert.equal(await f.send([event('fail')]), 200)
  assert.deepEqual(f.sent, [messages.unavailable])
  assert.deepEqual(f.logs, ['sheet_unavailable', 'reply_ok'])
})
test('one reply failure leaves that event retryable', async () => {
  const f = fixture()
  const reply = f.service.reply
  f.service.reply = async (token, msg) => {
    if (token === 'test-b') throw Error('reply failed')
    await reply(token, msg)
  }
  const batch = [event('a'), event('b')]
  assert.equal(await f.send(batch), 503)
  f.service.reply = reply
  assert.equal(await f.send(batch), 200)
  assert.equal(f.sent.length, 2)
})

