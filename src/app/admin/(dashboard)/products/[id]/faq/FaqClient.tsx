'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { ProductFAQ } from '@/types/database.types'

// ── FAQ Templates ──────────────────────────────────────────────────────────────

type FaqTemplate = { question: string; question_or: string; answer: string; answer_or: string }

const TEMPLATES: Record<string, FaqTemplate[]> = {
  oil: [
    { question: 'What is the shelf life of this oil?', question_or: 'ଏହି ତେଲର ଶୈଲ୍ଫ ଲାଇଫ୍ କ\'ଣ?', answer: '<p>This oil has a shelf life of 12–18 months from the date of manufacture when stored in a cool, dry place away from direct sunlight.</p>', answer_or: '' },
    { question: 'What is the extraction method used?', question_or: 'ଏହି ତେଲ କିପରି ପ୍ରସ୍ତୁତ?', answer: '<p>Our oil is processed using modern cold-press / solvent extraction methods to retain maximum nutrients and natural flavour.</p>', answer_or: '' },
    { question: 'How should I store this oil?', question_or: 'ଏହି ତେଲ କିପରି ସଂରକ୍ଷଣ କରିବେ?', answer: '<p>Store in a cool, dry place away from heat and light. Keep the container tightly closed after each use. Avoid storing near the stove.</p>', answer_or: '' },
    { question: 'What pack sizes are available for bulk orders?', question_or: 'ଥୋକ ଅର୍ଡର ପାଇଁ କେଉଁ ପ୍ୟାକ୍ ସାଇଜ ଅଛି?', answer: '<p>Available in 1L, 5L, 15L, and 15 kg tins for bulk wholesale orders. Contact us for custom packaging requirements.</p>', answer_or: '' },
    { question: 'Is this oil certified and quality-tested?', question_or: 'ଏହି ତେଲ ଗୁଣ ପ୍ରମାଣିତ କି?', answer: '<p>Yes, our oil meets FSSAI standards and is quality-tested at each production batch. Look for the FSSAI license number on the packaging.</p>', answer_or: '' },
  ],
  pulse: [
    { question: 'What is the protein content of this dal?', question_or: 'ଏହି ଡାଲ\' ର ପ୍ରୋଟିନ ପରିମାଣ କ\'ଣ?', answer: '<p>This dal is a rich source of plant protein, containing approximately 22–25g of protein per 100g serving, making it ideal for B2B bulk supply to restaurants and households.</p>', answer_or: '' },
    { question: 'What is the average cooking time?', question_or: 'ରାନ୍ଧିବା ପାଇଁ ଗଡ଼ ସମୟ କ\'ଣ?', answer: '<p>After proper soaking for 4–6 hours, this dal cooks in approximately 20–30 minutes on a stovetop, or 8–10 minutes in a pressure cooker.</p>', answer_or: '' },
    { question: 'How should bulk pulses be stored?', question_or: 'ଥୋକ ଡାଲ\' ସଂରକ୍ଷଣ ଉପାୟ?', answer: '<p>Store in a cool, dry, airtight container away from moisture and pests. Ideal storage temperature is below 25°C. Properly stored pulses last 12–18 months.</p>', answer_or: '' },
    { question: 'What varieties do you stock?', question_or: 'ଆପଣ ମାନଙ୍କ ପାଖରେ କ\'ଣ ଥରି ଅଛି?', answer: '<p>We stock a full range including Toor Dal, Moong Dal, Chana Dal, Masoor Dal, Urad Dal, and Rajma. Contact us for current availability and wholesale pricing.</p>', answer_or: '' },
    { question: 'What is the minimum wholesale order quantity?', question_or: 'ଥୋକ ଅର୍ଡର ର ଘୋଷିତ ସୀମା?', answer: '<p>Minimum order quantity for wholesale is 25 kg per variety. Custom packaging and labelling available for orders above 100 kg.</p>', answer_or: '' },
  ],
  atta: [
    { question: 'What type of wheat is used in this atta?', question_or: 'ଏହି ଆଟାରେ କ\'ଣ ଗହମ ବ୍ୟବହାର ହୋଇଛି?', answer: '<p>This atta is made from premium whole wheat (sharbati/MP wheat) milled to retain the bran and germ for maximum nutritional value.</p>', answer_or: '' },
    { question: 'What is the shelf life of this atta?', question_or: 'ଏହି ଆଟାର ଶୈଲ୍ଫ ଲାଇଫ୍ କ\'ଣ?', answer: '<p>When stored in a cool, dry, airtight container, the shelf life is 3–4 months from the milling date. Always store away from moisture and direct sunlight.</p>', answer_or: '' },
    { question: 'Is this atta organic?', question_or: 'ଏହି ଆଟା ଅର୍ଗାନିକ୍ କି?', answer: '<p>This atta is made from conventionally grown wheat. We also offer certified organic atta — please contact us for organic variants and pricing.</p>', answer_or: '' },
    { question: 'What is the grinding process?', question_or: 'ଆଟା ପ୍ରସ୍ତୁତ ପ୍ରକ୍ରିୟା?', answer: '<p>The wheat is cleaned, sorted, and stone-ground (chakki milling) to produce a fine yet nutritious flour with a natural wheat aroma.</p>', answer_or: '' },
    { question: 'What pack sizes are available for wholesale?', question_or: 'ଥୋକ ର ପ୍ୟାକ୍ ସାଇଜ?', answer: '<p>Available in 1 kg, 5 kg, 10 kg, 25 kg, and 50 kg bags for wholesale buyers. Branded and unbranded packaging available on request.</p>', answer_or: '' },
  ],
  spice: [
    { question: 'Where do your spices come from?', question_or: 'ଆପଣ ଙ୍କ ମସଲା କୋଉଠୁ ଆସେ?', answer: '<p>Our spices are sourced directly from prime growing regions — turmeric from Erode/Salem, pepper from Kerala, cumin from Rajasthan — ensuring superior quality and freshness.</p>', answer_or: '' },
    { question: 'How fresh are the spices?', question_or: 'ମସଲା କ\'ଣ ତଜା ଅଛି?', answer: '<p>We process and pack spices in small batches to ensure maximum freshness. Each batch is date-coded; typical freshness window post-packing is 6–12 months.</p>', answer_or: '' },
    { question: 'Are these spices ground or whole?', question_or: 'ଏହି ମସଲା ଗ୍ରାଉଣ୍ଡ ନା ଗୋଟା?', answer: '<p>Available in both ground (powder) and whole forms. Ground spices are freshly milled for maximum aroma. Specify your preference when ordering.</p>', answer_or: '' },
    { question: 'What is the shelf life?', question_or: 'ଶୈଲ୍ଫ ଲାଇଫ୍ କ\'ଣ?', answer: '<p>Ground spices: 12 months. Whole spices: 18–24 months. Always store in airtight containers away from heat, moisture, and light.</p>', answer_or: '' },
    { question: 'Do you have FSSAI/organic certification?', question_or: 'FSSAI ସାର୍ଟିଫିକେଟ ଅଛି କି?', answer: '<p>Yes, all our spice products carry FSSAI certification. Organic-certified variants are available for select spices — contact us for details.</p>', answer_or: '' },
  ],
  sugar: [
    { question: 'What type of sugar is this?', question_or: 'ଏହା କ\'ଣ ଧରଣର ଚିନି?', answer: '<p>This is refined white sugar (M30 / S30 grade) produced from sugarcane. We also supply raw cane sugar, khandsari, and natural jaggery (gur) — available on request.</p>', answer_or: '' },
    { question: 'What is the glycemic index?', question_or: 'ଗ୍ଲାଇସେମିକ ଇଣ୍ଡେକ୍ସ?', answer: '<p>Refined white sugar has a glycemic index of approximately 65. For lower GI alternatives, consider our jaggery or coconut sugar options.</p>', answer_or: '' },
    { question: 'What bulk pricing is available?', question_or: 'ଥୋକ ଦର?', answer: '<p>Wholesale pricing available for orders of 50 kg and above. Volume discounts apply at 200 kg, 500 kg, and 1 MT+ quantities. Contact our sales team for current rates.</p>', answer_or: '' },
    { question: 'Does it have quality certifications?', question_or: 'ଗୁଣ ସର୍ଟିଫିକେଟ ଅଛି?', answer: '<p>Our sugar meets BIS standards and FSSAI requirements. Packed under hygienically controlled conditions with batch tracking for traceability.</p>', answer_or: '' },
    { question: 'What are the available pack sizes?', question_or: 'ପ୍ୟାକ ସାଇଜ?', answer: '<p>Available in 1 kg, 5 kg, 25 kg, and 50 kg bags. Bulk unpackaged supply in gunny bags (50 kg) available for large wholesale buyers.</p>', answer_or: '' },
  ],
  water: [
    { question: 'What is the water source?', question_or: 'ଜଳ ଉତ୍ସ କ\'ଣ?', answer: '<p>Our packaged water is sourced from a protected underground aquifer and treated with multi-stage purification to ensure purity and consistent mineral balance.</p>', answer_or: '' },
    { question: 'What purification method is used?', question_or: 'ଶୁଦ୍ଧୀକରଣ ପ୍ରକ୍ରିୟା?', answer: '<p>The water goes through a 7-stage purification process including microfiltration, UV treatment, reverse osmosis, and ozonation before packaging, ensuring zero bacteria and virus contamination.</p>', answer_or: '' },
    { question: 'Is it BIS certified?', question_or: 'BIS ସାର୍ଟିଫିକେଟ ଅଛି?', answer: '<p>Yes, our packaged water is BIS certified under IS 14543 and bears the ISI mark. The license number is printed on every bottle label.</p>', answer_or: '' },
    { question: 'What bottle sizes are available?', question_or: 'ବୋତଲ ସାଇଜ?', answer: '<p>Available in 250 ml, 500 ml, 1 litre, 2 litre, 5 litre, and 20 litre jars. Customized label and private label options available for bulk B2B orders.</p>', answer_or: '' },
    { question: 'What is the minimum order for wholesale?', question_or: 'ଥୋକ ଅର୍ଡର ର ଘୋଷିତ ସୀମା?', answer: '<p>Minimum wholesale order is 1 carton (24 bottles for 1L). Volume discounts available starting from 10 cartons. Call us for bulk van-load pricing.</p>', answer_or: '' },
  ],
}

function getTemplates(categoryName: string): FaqTemplate[] {
  const name = categoryName.toLowerCase()
  if (name.includes('oil') || name.includes('ghee') || name.includes('vanaspati')) return TEMPLATES.oil
  if (name.includes('pulse') || name.includes('dal') || name.includes('lentil') || name.includes('bean')) return TEMPLATES.pulse
  if (name.includes('atta') || name.includes('flour') || name.includes('maida') || name.includes('wheat')) return TEMPLATES.atta
  if (name.includes('spice') || name.includes('masala') || name.includes('pepper') || name.includes('turmeric')) return TEMPLATES.spice
  if (name.includes('sugar') || name.includes('jaggery') || name.includes('gur') || name.includes('sweetener')) return TEMPLATES.sugar
  if (name.includes('water') || name.includes('bottle') || name.includes('mineral')) return TEMPLATES.water
  return TEMPLATES.oil // fallback
}

// ── Types ──────────────────────────────────────────────────────────────────────

type FaqRow = ProductFAQ

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FaqClient({
  productId,
  productName,
  categoryName,
  initialFaqs,
  tableExists,
}: {
  productId: string
  productName: string
  categoryName: string
  initialFaqs: FaqRow[]
  tableExists: boolean
}) {
  const [faqs, setFaqs] = useState<FaqRow[]>(initialFaqs)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [addingBulk, setAddingBulk] = useState(false)

  const [addForm, setAddForm] = useState({ question: '', question_or: '', answer: '', answer_or: '' })
  const [translating, setTranslating] = useState(false)

  async function translateAddForm() {
    const fields: Record<string, string> = {}
    if (addForm.question.trim()) fields.question = addForm.question.trim()
    if (addForm.answer.trim()) fields.answer = addForm.answer.trim()
    if (Object.keys(fields).length === 0) { showToast('Enter the English question & answer first'); return }
    setTranslating(true)
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    if (res.ok) {
      const { translations } = await res.json() as { translations: Record<string, string> }
      setAddForm(prev => ({
        ...prev,
        question_or: translations.question ?? prev.question_or,
        answer_or: translations.answer ?? prev.answer_or,
      }))
      showToast('Translated to Odia!')
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast(d.error ?? 'Translation failed')
    }
    setTranslating(false)
  }
  const [editForm, setEditForm] = useState<Partial<FaqRow>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3000)
  }

  // ── DnD reorder ─────────────────────────────────────────────────────────────

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = faqs.findIndex(f => f.id === active.id)
    const newIdx = faqs.findIndex(f => f.id === over.id)
    const reordered = arrayMove(faqs, oldIdx, newIdx).map((f, i) => ({ ...f, display_order: i }))
    setFaqs(reordered)
    await Promise.all(reordered.map(f =>
      fetch(`/api/faq/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: f.display_order }),
      }),
    ))
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/faq/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setFaqs(prev => prev.map(f => f.id === id ? { ...f, is_active: !current } : f))
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function deleteFaq(id: string) {
    if (!confirm('Delete this FAQ?')) return
    const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFaqs(prev => prev.filter(f => f.id !== id))
      showToast('FAQ deleted')
    }
  }

  // ── Add new FAQ ──────────────────────────────────────────────────────────────

  async function submitAdd() {
    if (!addForm.question.trim() || !addForm.answer.trim()) return
    setSaving(true)
    const res = await fetch(`/api/products/${productId}/faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: addForm.question.trim(),
        question_or: addForm.question_or.trim() || null,
        answer: addForm.answer.trim(),
        answer_or: addForm.answer_or.trim() || null,
        display_order: faqs.length,
        is_active: true,
      }),
    })
    if (res.ok) {
      const newFaq = await res.json() as FaqRow
      setFaqs(prev => [...prev, newFaq])
      setAddForm({ question: '', question_or: '', answer: '', answer_or: '' })
      setShowAdd(false)
      showToast('FAQ added!')
    } else {
      const d = await res.json() as { error?: string }
      showToast(d.error ?? 'Failed to add FAQ')
    }
    setSaving(false)
  }

  // ── Save edit ────────────────────────────────────────────────────────────────

  async function submitEdit(id: string) {
    if (!editForm.question?.trim() || !editForm.answer?.trim()) return
    setSaving(true)
    const res = await fetch(`/api/faq/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: editForm.question?.trim(),
        question_or: editForm.question_or?.trim() || null,
        answer: editForm.answer?.trim(),
        answer_or: editForm.answer_or?.trim() || null,
      }),
    })
    if (res.ok) {
      setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...editForm } as FaqRow : f))
      setEditingId(null)
      showToast('FAQ saved!')
    }
    setSaving(false)
  }

  // ── Add common FAQs ──────────────────────────────────────────────────────────

  async function addCommonFaqs() {
    const templates = getTemplates(categoryName)
    setAddingBulk(true)
    const newFaqs: FaqRow[] = []
    for (const tpl of templates) {
      const res = await fetch(`/api/products/${productId}/faq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: tpl.question,
          question_or: tpl.question_or || null,
          answer: tpl.answer,
          answer_or: tpl.answer_or || null,
          display_order: faqs.length + newFaqs.length,
          is_active: true,
        }),
      })
      if (res.ok) {
        const faq = await res.json() as FaqRow
        newFaqs.push(faq)
      }
    }
    setFaqs(prev => [...prev, ...newFaqs])
    setAddingBulk(false)
    showToast(`Added ${newFaqs.length} common FAQs!`)
  }

  const templateLabel = (() => {
    const n = categoryName.toLowerCase()
    if (n.includes('oil') || n.includes('ghee')) return 'Edible Oil'
    if (n.includes('pulse') || n.includes('dal')) return 'Pulses'
    if (n.includes('atta') || n.includes('flour')) return 'Atta'
    if (n.includes('spice') || n.includes('masala')) return 'Spices'
    if (n.includes('sugar') || n.includes('jaggery')) return 'Sugar'
    if (n.includes('water') || n.includes('bottle')) return 'Water'
    return categoryName || 'Common'
  })()

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-3xl mx-auto w-full pb-12 space-y-gutter">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/products/${productId}`}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary">FAQ</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{productName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addCommonFaqs}
            disabled={addingBulk || !tableExists}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {addingBulk
              ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined text-[16px]">auto_awesome</span>}
            {addingBulk ? 'Adding…' : `Add ${templateLabel} FAQs`}
          </button>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null) }}
            disabled={!tableExists}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add FAQ
          </button>
        </div>
      </div>

      {/* ── Migration notice ── */}
      {!tableExists && (
        <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <div>
            <p className="font-body-md text-body-md text-amber-800 font-medium">DB Migration Required</p>
            <p className="font-body-md text-body-md text-amber-700 mt-0.5">
              The <code className="bg-amber-100 px-1 rounded">product_faqs</code> table does not exist yet. Run the migration to enable FAQ management.
            </p>
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      {showAdd && (
        <div className="bg-surface rounded-2xl border border-primary/30 p-6 space-y-5" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.10)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-primary">New FAQ</h3>
            <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <FaqFormFields
            form={addForm}
            onChange={patch => setAddForm(prev => ({ ...prev, ...patch }))}
          />
          <button
            type="button"
            onClick={translateAddForm}
            disabled={translating}
            title="Fill the Odia question & answer from the English fields using AI"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-primary/30 text-primary rounded-full font-body-md text-body-md hover:border-primary/60 disabled:opacity-60 transition-colors w-max"
          >
            <span className={`material-symbols-outlined text-[16px] ${translating ? 'animate-spin' : ''}`}>
              {translating ? 'progress_activity' : 'translate'}
            </span>
            {translating ? 'Translating…' : 'Translate to Odia'}
          </button>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-outline-variant rounded-full font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={submitAdd}
              disabled={saving || !addForm.question.trim() || !addForm.answer.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {saving ? 'Saving…' : 'Save FAQ'}
            </button>
          </div>
        </div>
      )}

      {/* ── FAQ list ── */}
      {faqs.length === 0 && !showAdd ? (
        <div className="py-16 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">No FAQs yet.</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            Use "Add FAQ" or the smart template button above to get started.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={faqs.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {faqs.map(faq => (
                editingId === faq.id ? (
                  <div key={faq.id} className="bg-surface rounded-2xl border border-primary/30 p-6 space-y-5" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.10)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline-sm text-headline-sm text-primary">Edit FAQ</h3>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                    <FaqFormFields
                      form={{
                        question: editForm.question ?? faq.question,
                        question_or: editForm.question_or ?? faq.question_or ?? '',
                        answer: editForm.answer ?? faq.answer,
                        answer_or: editForm.answer_or ?? faq.answer_or ?? '',
                      }}
                      onChange={patch => setEditForm(prev => ({ ...prev, ...patch }))}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 border border-outline-variant rounded-full font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => submitEdit(faq.id)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <SortableFaqRow
                    key={faq.id}
                    faq={faq}
                    expanded={expandedId === faq.id}
                    onToggleExpand={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                    onEdit={() => {
                      setEditForm({ question: faq.question, question_or: faq.question_or ?? '', answer: faq.answer, answer_or: faq.answer_or ?? '' })
                      setEditingId(faq.id)
                      setShowAdd(false)
                    }}
                    onToggleActive={() => toggleActive(faq.id, faq.is_active)}
                    onDelete={() => deleteFaq(faq.id)}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
        {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} · Drag to reorder
      </p>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Sortable row ───────────────────────────────────────────────────────────────

function SortableFaqRow({
  faq, expanded, onToggleExpand, onEdit, onToggleActive, onDelete,
}: {
  faq: FaqRow
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: faq.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-surface rounded-2xl border border-outline-variant/50 overflow-hidden transition-shadow',
        isDragging && 'opacity-60 shadow-xl',
        !faq.is_active && 'opacity-60',
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-on-surface-variant p-1 flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
        </button>

        <button
          onClick={onToggleExpand}
          className="flex-1 text-left min-w-0"
        >
          <p className="font-body-md text-body-md text-on-surface font-medium truncate pr-2">
            {faq.question}
          </p>
          {faq.question_or && (
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{faq.question_or}</p>
          )}
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Active toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={faq.is_active}
            onClick={onToggleActive}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              faq.is_active ? 'bg-primary' : 'bg-surface-container-highest',
            )}
          >
            <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', faq.is_active ? 'translate-x-4' : 'translate-x-1')} />
          </button>

          <button onClick={onEdit} className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
          <button onClick={onToggleExpand} className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">{expanded ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>

      {/* Expanded answer */}
      {expanded && (
        <div className="px-6 pb-5 border-t border-outline-variant/20">
          <div
            className="mt-4 prose prose-sm max-w-none font-body-md text-body-md text-on-surface"
            dangerouslySetInnerHTML={{ __html: faq.answer }}
          />
          {faq.answer_or && (
            <div
              className="mt-3 pt-3 border-t border-outline-variant/20 prose prose-sm max-w-none font-body-md text-body-md text-on-surface-variant"
              dangerouslySetInnerHTML={{ __html: faq.answer_or }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Form fields (shared for add + edit) ───────────────────────────────────────

function FaqFormFields({
  form,
  onChange,
}: {
  form: { question: string; question_or: string; answer: string; answer_or: string }
  onChange: (patch: Partial<typeof form>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="font-label-md text-label-md text-on-surface font-medium">
            Question (English) <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.question}
            onChange={e => onChange({ question: e.target.value })}
            placeholder="What is the shelf life?"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-label-md text-label-md text-on-surface font-medium">Question (Odia)</label>
          <input
            type="text"
            value={form.question_or}
            onChange={e => onChange({ question_or: e.target.value })}
            placeholder="ଓଡ଼ିଆ ପ୍ରଶ୍ନ…"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="font-label-md text-label-md text-on-surface font-medium">
          Answer (English) <span className="text-error">*</span>
        </label>
        <MiniRichText
          content={form.answer}
          onChange={v => onChange({ answer: v })}
          placeholder="Type the answer here…"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-label-md text-label-md text-on-surface font-medium">Answer (Odia)</label>
        <MiniRichText
          content={form.answer_or}
          onChange={v => onChange({ answer_or: v })}
          placeholder="ଓଡ଼ିଆ ଉତ୍ତର…"
        />
      </div>
    </div>
  )
}

// ── Mini rich-text editor ──────────────────────────────────────────────────────

function MiniRichText({ content, onChange, placeholder }: {
  content: string; onChange: (html: string) => void; placeholder?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none font-body-md text-body-md text-on-surface',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return (
    <div className="border border-outline-variant rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-outline-variant bg-surface-container-low">
        {[
          { cmd: () => editor?.chain().focus().toggleBold().run(), active: !!editor?.isActive('bold'), icon: 'format_bold' },
          { cmd: () => editor?.chain().focus().toggleItalic().run(), active: !!editor?.isActive('italic'), icon: 'format_italic' },
          { cmd: () => editor?.chain().focus().toggleBulletList().run(), active: !!editor?.isActive('bulletList'), icon: 'format_list_bulleted' },
        ].map(({ cmd, active, icon }) => (
          <button
            key={icon}
            type="button"
            onClick={cmd}
            className={cn('p-1 rounded-lg transition-colors', active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container')}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
          </button>
        ))}
      </div>
      {!content && (
        <p className="absolute pointer-events-none p-3 text-on-surface-variant font-body-md text-body-md text-sm">{placeholder}</p>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
