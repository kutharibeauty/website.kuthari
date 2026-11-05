import 'server-only'
import { aiJSON } from './openrouter'

/**
 * The two AI writers for product listings, shared by the product form's
 * "Generate" buttons and the Products page's "Fill with AI" bulk action.
 */
export interface ProductFacts {
  name: string
  brand?: string | null
  category?: string | null
  price?: number | null
  unit?: string | null
  description?: string | null
}

const STORE = 'KUTHARI BEAUTY STORE, a beauty shop in Brahmapur, Odisha that sells cosmetics, skincare, haircare, salon and grooming products online across India'

function factLines(p: ProductFacts): string {
  return [
    `Product: ${p.name}`,
    p.brand ? `Brand: ${p.brand}` : null,
    p.category ? `Category: ${p.category}` : null,
    p.price != null ? `Price: ₹${p.price}${p.unit ? ` per ${p.unit}` : ''}` : null,
    p.unit ? `Unit / pack: ${p.unit}` : null,
  ].filter(Boolean).join('\n')
}

/** English + Odia description as simple HTML. */
export async function writeDescription(p: ProductFacts, extra?: string): Promise<{ description: string; description_or: string }> {
  const system = `You are a product copywriter for ${STORE}. Most shoppers buy a single piece at retail price; salons and shops can also buy by the box at a bulk price. You write clear, warm, trustworthy descriptions. You always reply with strict JSON only.`
  const user = `Write a product description for this listing.

${factLines(p)}
${extra ? `\nExtra instructions from the admin: ${extra}` : ''}

Requirements:
- English version: 60-110 words. Lead with what the product does and who it suits, then how to use it. Mention the bulk price only if a box or pack is part of the listing. Do NOT invent specific certifications, weights or prices that were not provided.
- Odia version: a faithful natural translation of the English version into Odia (ଓଡ଼ିଆ) script.
- Format BOTH as simple, clean HTML using only these tags: <p>, <ul>, <li>, <strong>. No headings, no inline styles, no markdown.

Return ONLY this JSON, no commentary:
{"description":"<p>...English HTML...</p>","description_or":"<p>...Odia HTML...</p>"}`
  const json = await aiJSON<{ description?: string; description_or?: string }>({ system, user, maxTokens: 3000, temperature: 0.7 })
  if (!json.description?.trim()) throw new Error('AI did not return a description. Please try again.')
  return { description: json.description.trim(), description_or: (json.description_or ?? '').trim() }
}

/** Meta title, meta description and 10 buying keywords. */
export async function writeSeo(p: ProductFacts): Promise<{ meta_title: string; meta_description: string; keywords: string[] }> {
  const plainDesc = p.description ? p.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400) : 'N/A'
  const system = `You are an SEO expert for ${STORE}, by the piece at retail price or by the box at bulk price. You always reply with strict JSON only.`
  const user = `Generate SEO metadata for this product listing.
${factLines(p)}
- Description: ${plainDesc}

Rules:
- Write for shoppers in India searching to buy this product online.
- meta_title: <= 60 characters, must include the product name.
- meta_description: <= 160 characters, says what the product is and ends with a call to action.
- keywords: exactly 10 specific, high-intent buying keywords (no filler), mixing short ones (brand + product) and long ones (buy … online in India).

Return ONLY this JSON, no markdown, no commentary:
{"meta_title":"...","meta_description":"...","keywords":["...","..."]}`
  const json = await aiJSON<{ meta_title?: string; meta_description?: string; keywords?: string[] }>({ system, user, maxTokens: 1500, temperature: 0.5 })
  const meta_title = (json.meta_title ?? '').trim().slice(0, 60)
  if (!meta_title) throw new Error('AI did not return SEO details. Please try again.')
  return {
    meta_title,
    meta_description: (json.meta_description ?? '').trim().slice(0, 160),
    keywords: Array.isArray(json.keywords) ? json.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 10) : [],
  }
}
