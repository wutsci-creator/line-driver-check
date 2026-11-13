import test from 'node:test'
import assert from 'node:assert/strict'
import { reply } from '../lib/services.ts'

test('LINE HTTP error rejects the reply without exposing response body', async t => {
  const original = process.env.LINE_CHANNEL_ACCESS_TOKEN
  process.env.LINE_CHANNEL_ACCESS_TOKEN = 'fixture-only'
  t.after(() => {
    if (original === undefined) delete process.env.LINE_CHANNEL_ACCESS_TOKEN
    else process.env.LINE_CHANNEL_ACCESS_TOKEN = original
  })
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('private error detail', { status: 429 }))
  await assert.rejects(reply('fixture-token', 'fixture-message'), { message: 'line_reply' })
  mock.mock.mockImplementation(async () => new Response('{}', { status: 200 }))
  await reply('fixture-token', 'fixture-message')
})

