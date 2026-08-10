'use client'

import { useState } from 'react'
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
  skincare: [
    { question: 'Is this product suitable for all skin types?', question_or: '', answer: '<p>This product is formulated for normal to combination skin. If you have sensitive or acne-prone skin, we recommend a patch test on the inner forearm 24 hours before first use.</p>', answer_or: '' },
    { question: 'What is the shelf life and how should it be stored?', question_or: '', answer: '<p>Unopened, the product stays good until the expiry date printed on the pack. Once opened, use within the period shown by the jar symbol (typically 6-12 months). Store in a cool, dry place away from direct sunlight.</p>', answer_or: '' },
    { question: 'Is this product genuine and sealed?', question_or: '', answer: '<p>Yes. Every product we supply is sourced from authorised distributors and reaches you factory-sealed with the batch number and expiry printed on the pack.</p>', answer_or: '' },
    { question: 'Is it tested on animals?', question_or: '', answer: '<p>Please refer to the brand markings on the pack. We stock both cruelty-free certified and conventional brands — get in touch if you need cruelty-free options specifically.</p>', answer_or: '' },
    { question: 'What pack sizes are available for bulk orders?', question_or: '', answer: '<p>Single pieces are available at retail rates, and bulk is sold by the box or pack. Contact us for the current bulk rate on your preferred size.</p>', answer_or: '' },
  ],
  haircare: [
    { question: 'Is this suitable for coloured or chemically treated hair?', question_or: '', answer: '<p>Check the pack for a colour-safe or sulphate-free marking. We stock ranges specifically formulated for coloured, keratin-treated and chemically processed hair — ask us for recommendations.</p>', answer_or: '' },
    { question: 'What is the shelf life?', question_or: '', answer: '<p>Typically 24-36 months unopened, and 12 months after opening. The exact expiry is printed on every pack.</p>', answer_or: '' },
    { question: 'Do you supply salon and professional sizes?', question_or: '', answer: '<p>Yes. Alongside retail sizes we stock salon/professional litre packs. These are usually sold by the box — contact us for professional pricing.</p>', answer_or: '' },
    { question: 'Are these products genuine brand stock?', question_or: '', answer: '<p>Yes, sourced from authorised distributors with batch numbers intact. We do not deal in refills or repackaged goods.</p>', answer_or: '' },
    { question: 'What is the minimum for bulk pricing?', question_or: '', answer: '<p>Bulk rates apply from one full box or pack. The exact quantity per box is shown on the product page when you choose the bulk option.</p>', answer_or: '' },
  ],
  makeup: [
    { question: 'What shades are available?', question_or: '', answer: '<p>Available shades are listed on the product page. If a shade you need is not shown, contact us — we can usually source it from the full brand range.</p>', answer_or: '' },
    { question: 'Is this long-wear or transfer-proof?', question_or: '', answer: '<p>Wear time varies by formula and is stated on the pack. Matte and long-wear formulas typically last 6-8 hours; check the individual product description.</p>', answer_or: '' },
    { question: 'How should makeup be stored?', question_or: '', answer: '<p>Keep in a cool, dry place away from direct sunlight and heat. Extreme heat can separate cream and liquid formulas, so avoid leaving stock in a hot vehicle or near a window.</p>', answer_or: '' },
    { question: 'Are products sealed and within expiry?', question_or: '', answer: '<p>Yes. All stock is factory-sealed with a clearly printed batch number and expiry date. We do not supply short-expiry or tester stock.</p>', answer_or: '' },
    { question: 'Can I mix shades within one bulk box?', question_or: '', answer: '<p>Mixed-shade boxes can often be arranged for regular buyers. Contact us with your shade split and we will confirm availability.</p>', answer_or: '' },
  ],
  salon: [
    { question: 'Is this a professional or retail product?', question_or: '', answer: '<p>This is professional salon stock intended for trained use. Usage directions and any required dilution ratios are printed on the pack.</p>', answer_or: '' },
    { question: 'Do you supply salons and parlours directly?', question_or: '', answer: '<p>Yes. We supply salons, parlours and beauty academies with bulk pricing on box and pack quantities. Get in touch to discuss regular supply.</p>', answer_or: '' },
    { question: 'What safety precautions apply?', question_or: '', answer: '<p>Always follow the manufacturer directions on the pack, carry out any recommended patch test, and use gloves where indicated. Keep out of reach of children.</p>', answer_or: '' },
    { question: 'What is the shelf life?', question_or: '', answer: '<p>Most professional products last 24-36 months unopened. The batch number and expiry are printed on every pack.</p>', answer_or: '' },
    { question: 'Are bulk rates available?', question_or: '', answer: '<p>Yes — choose the bulk option on the product page to see box and pack rates, or contact us for a quote on larger regular orders.</p>', answer_or: '' },
  ],
  fragrance: [
    { question: 'Is this an original branded fragrance?', question_or: '', answer: '<p>Yes. We supply only genuine branded stock through authorised channels, sealed with the batch code intact. We do not deal in first-copy or replica fragrances.</p>', answer_or: '' },
    { question: 'How long does the fragrance last?', question_or: '', answer: '<p>Longevity depends on the concentration. Eau de Toilette typically lasts 3-5 hours and Eau de Parfum 6-8 hours, varying with skin type and climate.</p>', answer_or: '' },
    { question: 'How should fragrances be stored?', question_or: '', answer: '<p>Store upright in a cool, dark place. Heat and sunlight break down fragrance oils, so keep stock away from windows and direct light.</p>', answer_or: '' },
    { question: 'What sizes do you stock?', question_or: '', answer: '<p>Sizes vary by brand and are listed on the product page. Deodorants and body sprays are typically sold by the box for bulk buyers.</p>', answer_or: '' },
    { question: 'Are testers available?', question_or: '', answer: '<p>Tester units can sometimes be arranged for regular retail buyers. Contact us to check current availability.</p>', answer_or: '' },
  ],
  grooming: [
    { question: 'Is this suitable for sensitive skin?', question_or: '', answer: '<p>Check the pack for a sensitive-skin or fragrance-free marking. We stock ranges made for sensitive skin — ask us if you need specific recommendations.</p>', answer_or: '' },
    { question: 'What is the shelf life?', question_or: '', answer: '<p>Typically 24-36 months unopened. The expiry date and batch number are printed on every pack.</p>', answer_or: '' },
    { question: 'Do you stock complete grooming kits?', question_or: '', answer: '<p>Yes, we stock both individual products and combo kits. Kits are usually sold by the box at bulk rates.</p>', answer_or: '' },
    { question: 'Are the products genuine?', question_or: '', answer: '<p>Yes, sourced from authorised distributors and supplied factory-sealed with batch numbers intact.</p>', answer_or: '' },
    { question: 'What is the minimum for bulk pricing?', question_or: '', answer: '<p>Bulk rates start from one full box or pack. The quantity per box is shown when you select the bulk option on the product page.</p>', answer_or: '' },
  ],
}

function getTemplates(categoryName: string): FaqTemplate[] {
  const name = categoryName.toLowerCase()
  if (name.includes('hair') || name.includes('shampoo') || name.includes('conditioner')) return TEMPLATES.haircare
  if (name.includes('makeup') || name.includes('make-up') || name.includes('cosmetic') || name.includes('lip') || name.includes('nail')) return TEMPLATES.makeup
  if (name.includes('salon') || name.includes('parlour') || name.includes('parlor') || name.includes('professional')) return TEMPLATES.salon
  if (name.includes('perfume') || name.includes('fragrance') || name.includes('deo') || name.includes('body spray')) return TEMPLATES.fragrance
  if (name.includes('groom') || name.includes('shav') || name.includes('beard') || name.includes('men')) return TEMPLATES.grooming
  return TEMPLATES.skincare // fallback — skincare covers the broadest range
}

// ── Types ──────────────────────────────────────────────────────────────────────

type FaqRow = ProductFAQ

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200'

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

  // Mirrors getTemplates() above — keep the two in step so the button label
  // names the template set that will actually be inserted.
  const templateLabel = (() => {
    const n = categoryName.toLowerCase()
    if (n.includes('hair') || n.includes('shampoo') || n.includes('conditioner')) return 'Haircare'
    if (n.includes('makeup') || n.includes('make-up') || n.includes('cosmetic') || n.includes('lip') || n.includes('nail')) return 'Makeup'
    if (n.includes('salon') || n.includes('parlour') || n.includes('parlor') || n.includes('professional')) return 'Salon'
    if (n.includes('perfume') || n.includes('fragrance') || n.includes('deo') || n.includes('body spray')) return 'Fragrance'
    if (n.includes('groom') || n.includes('shav') || n.includes('beard') || n.includes('men')) return 'Grooming'
    return 'Skincare'
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
