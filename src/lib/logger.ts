import { createAdminClient } from '@/lib/supabase/server'

interface LogPayload {
  route: string
  message: string
  code?: string | null
  stack?: string | null
  userId?: string | null
}

export async function logError(payload: LogPayload): Promise<void> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('error_log').insert({
      route: payload.route,
      message: payload.message,
      code: payload.code ?? null,
      stack: payload.stack ?? null,
      user_id: payload.userId ?? null,
    })
  } catch {
    // Never let logging crash the caller
  }
}

export function errorPayload(err: unknown, route: string, userId?: string | null): LogPayload {
  const e = err instanceof Error ? err : new Error(String(err))
  return {
    route,
    message: e.message,
    code: (e as NodeJS.ErrnoException).code ?? null,
    stack: e.stack ?? null,
    userId: userId ?? null,
  }
}
