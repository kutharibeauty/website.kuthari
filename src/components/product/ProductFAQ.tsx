'use client'

import { useT } from '@/hooks/useT'
import type { ProductFAQ as PFAQ } from '@/types/database.types'

interface Props {
  faqs: PFAQ[]
}

export default function ProductFAQ({ faqs }: Props) {
  const { tField } = useT()
  if (!faqs.length) return null

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-0 py-8">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
        Frequently Asked Questions
      </h2>

      <div className="border-t border-outline-variant">
        {faqs.map((faq) => (
          <details key={faq.id} className="group border-b border-outline-variant">
            <summary className="flex items-center justify-between cursor-pointer py-4 font-headline-md text-headline-md text-on-surface hover:text-primary transition-colors select-none">
              <span>{tField(faq.question, faq.question_or)}</span>
              <span
                className="material-symbols-outlined text-on-surface-variant flex-shrink-0 ml-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                expand_more
              </span>
            </summary>
            <div
              className="pb-4 font-body-lg text-body-lg text-on-surface-variant leading-relaxed break-words [&_a]:text-primary [&_a]:underline [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-black [&_strong]:text-primary"
              dangerouslySetInnerHTML={{ __html: tField(faq.answer, faq.answer_or) }}
            />
          </details>
        ))}
      </div>
    </section>
  )
}
