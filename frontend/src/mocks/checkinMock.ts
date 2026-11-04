import { ApiError } from '../types/checkin'
import type { CheckInInfo, CheckInResult } from '../types/checkin'

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms))

export async function mockGetInfo(token: string): Promise<CheckInInfo> {
  await wait()
  if (token === 'closed-token')
    return { display_name: 'Fake Club: Weekly Meeting', identifier_label: 'RIN', is_open: false }
  if (token === 'network-error') throw new ApiError('NETWORK_ERROR', 'Network error', 0)
  if (token !== 'open-token') throw new ApiError('NOT_FOUND', 'Invalid link', 404)
  return { display_name: 'Fake Club: Weekly Meeting', identifier_label: 'RIN', is_open: true }
}

export async function mockSubmit(_token: string, identifier: string): Promise<CheckInResult> {
  await wait()
  if (identifier === '0000') return { status: 'already_checked_in', message: 'You already checked in.' }
  if (identifier === '9999') return { status: 'pending_review', message: 'An officer will review your check-in.' }
  if (identifier === '5555') throw new ApiError('CHECK_IN_CLOSED', 'Check-in is closed.', 409)
  if (identifier === '4444') throw new ApiError('RATE_LIMITED', 'Too many attempts.', 429)
  return { status: 'accepted', message: 'Check-in received.' }
}