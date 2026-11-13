import { JWT } from 'google-auth-library'
import { readIndex } from './check.ts'

export function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw Error('configuration')
  return value
}

let client: JWT | undefined
export async function loadIds() {
  const tab = required('GOOGLE_SHEET_NAME').replaceAll("'", "''")
  const range = encodeURIComponent("'" + tab + "'!A1:G")
  const sheet = encodeURIComponent(required('GOOGLE_SPREADSHEET_ID'))
  client ??= new JWT({
    email: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    key: required('GOOGLE_PRIVATE_KEY').replaceAll('\\n', '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const { token } = await client.getAccessToken()
  if (!token) throw Error('google_auth')
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet + '/values/' + range
  const response = await fetch(url + '?valueRenderOption=UNFORMATTED_VALUE', {
    headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw Error('google_read')
  return readIndex((await response.json()).values)
}

export async function reply(replyToken: string, text: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000),
    headers: {
      Authorization: 'Bearer ' + required('LINE_CHANNEL_ACCESS_TOKEN'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
  if (!response.ok) throw Error('line_reply')
}

