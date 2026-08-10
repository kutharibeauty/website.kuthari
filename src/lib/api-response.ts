import { NextResponse } from 'next/server'

type SuccessResponse<T> = { success: true; data: T }
type ErrorResponse = { success: false; error: string; code?: string }

export function ok<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(
  error: string,
  status = 400,
  code?: string,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, error, ...(code && { code }) },
    { status },
  )
}
