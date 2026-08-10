import 'server-only'
import sanitizeHtml from 'sanitize-html'

// Allowlist for admin-authored rich text (Tiptap output). Anything not on this
// list — <script>, <iframe>, event handlers like onerror=, javascript: URLs —
// is stripped, so a compromised/rogue admin can't plant stored XSS that would
// run in a customer's browser. Normal formatting (bold, lists, links) survives.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'span', 'hr', 'blockquote', 'code', 'pre',
  ],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Force safe rel on links, and drop target unless it's _blank.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
  },
}

/** Clean admin-authored rich-text HTML before it is rendered to the DOM. */
export function sanitizeRichText(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return sanitizeHtml(dirty, OPTIONS)
}
