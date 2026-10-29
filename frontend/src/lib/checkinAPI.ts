import { ApiError } from '../types/checkin'
import type { CheckInInfo, CheckInResult } from '../types/checkin'
import { mockGetInfo, mockSubmit } from '../mocks/checkinMock.ts'

const USE_MOCKS = true // TODO Ticket C: set to false when the real API exists

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const e = body?.error
    throw new ApiError(e?.code ?? 'UNKNOWN', e?.message ?? 'Something went wrong.', res.status, e?.field ?? null)
  }
  return res.json()
}

export function getCheckInInfo(token: string): Promise<CheckInInfo> {
  if (USE_MOCKS) return mockGetInfo(token)
  return request(`/api/check-ins/${encodeURIComponent(token)}`)
}

export function submitCheckIn(token: string, identifier: string): Promise<CheckInResult> {
  if (USE_MOCKS) return mockSubmit(token, identifier)
  return request(`/api/check-ins/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  })
}