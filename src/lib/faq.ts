import { sanitizeRichText } from '@/lib/sanitize'

/**
 * Build a safe product_faqs row from a request body.
 *
 * Never spread the raw body into the table: it lets a caller set any column
 * (mass assignment), and the answer fields are rich text rendered with
 * dangerouslySetInnerHTML on the public product page. Sanitizing on write keeps
 * dangerous markup out of the database entirely; getProductFAQs also sanitizes
 * on read so rows stored before this still render safely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFaqRow(body: any): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {}
  if (typeof body?.question === 'string') row.question = body.question.trim()
  if (typeof body?.question_or === 'string') row.question_or = body.question_or.trim()
  if (typeof body?.answer === 'string') row.answer = sanitizeRichText(body.answer)
  if (typeof body?.answer_or === 'string') row.answer_or = sanitizeRichText(body.answer_or)
  if (typeof body?.is_active === 'boolean') row.is_active = body.is_active
  if (typeof body?.display_order === 'number') row.display_order = body.display_order
  return row
}
