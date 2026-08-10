import { randomInt } from 'crypto'

// Unambiguous alphabet — no 0/O/1/I/L to avoid misreads when shared verbally.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** A short random suffix from a cryptographically strong source. */
function randomSuffix(len = 6): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

/**
 * Build a referral code personalised to the customer but hard to guess:
 * up to 4 letters from their name + a 6-char crypto-random suffix
 * (~30^6 ≈ 700M possibilities), e.g. "RAVI7KQ2MB".
 */
export function generateReferralCode(name?: string | null): string {
  const prefix = (name ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4) || 'KBS'
  return `${prefix}${randomSuffix(6)}`
}

/**
 * Generate a code guaranteed unique against profiles.referral_code, retrying on
 * the (astronomically rare) collision.
 */
export async function generateUniqueReferralCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  name?: string | null,
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateReferralCode(name)
    const { data } = await db.from('profiles').select('id').eq('referral_code', code).maybeSingle()
    if (!data) return code
  }
  // Extremely unlikely fallback — longer suffix.
  return `${'KBS'}${randomSuffix(10)}`
}
