// PostgREST rejects an entire insert/update when the payload names a column that
// doesn't exist on the (drifted) live table — e.g. categories.icon, which the
// admin form still sends but the live table never had. Rather than let a
// vestigial field block the whole save, strip whichever column it complains
// about and retry.
//
// Usage:
//   const { data, error } = await writeStrippingMissingColumns(body, (payload) =>
//     supabase.from('categories').insert(payload).select('id').single())

// Supabase's query builder is a thenable (PromiseLike), not a full Promise, so
// accept PromiseLike here — `await` resolves it either way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WriteAttempt = (payload: Record<string, any>) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>

export async function writeStrippingMissingColumns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>,
  attempt: WriteAttempt,
) {
  const payload = { ...body }
  // Bounded so a persistent error can never loop forever.
  for (let i = 0; i < 8; i++) {
    const res = await attempt(payload)
    if (!res.error) return res
    const missing = (res.error.message ?? '').match(/Could not find the '([^']+)' column/i)
    if (missing && missing[1] in payload) {
      delete payload[missing[1]]
      continue
    }
    return res
  }
  return { data: null, error: { message: 'Payload references too many unknown columns.' } }
}
