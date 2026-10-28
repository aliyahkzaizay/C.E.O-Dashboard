export type CheckInInfo = {
  display_name: string       // event / organization name
  identifier_label: string   // e.g. "RIN" or "Email"
  is_open: boolean
}

export type CheckInResult = {
  status: 'accepted' | 'already_checked_in' | 'pending_review'
  message: string
}

// The agreed error shape from the API reference
export class ApiError extends Error {
  code: string
  status: number
  field: string | null
  constructor(code: string, message: string, status = 0, field: string | null = null) {
    super(message)
    this.code = code
    this.status = status
    this.field = field
  }
}