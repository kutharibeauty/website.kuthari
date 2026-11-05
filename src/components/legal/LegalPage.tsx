import type { ReactNode } from 'react'

interface Section {
  heading: string
  body: ReactNode
}

interface Props {
  title: string
  accent: string
  updated: string
  intro: ReactNode
  sections: Section[]
}

/**
 * One layout for every policy page: the display head, a short intro, then
 * numbered sections in a readable measure. Policies are text people need to
 * read, so the page stays plain below the head.
 */
export default function LegalPage({ title, accent, updated, intro, sections }: Props) {
  return (
    <article className="mx-auto w-full max-w-[1440px] px-5 md:px-10 pt-10 md:pt-16">
      <header className="max-w-4xl">
        <h1 className="display text-[clamp(2.75rem,1.8rem+4vw,6rem)]">{title}</h1>
        <p className="accent-line mt-1 text-[clamp(2.25rem,1.5rem+3.2vw,4.75rem)]">{accent}</p>
        <p className="mt-6 text-[14px] text-muted">Last updated {updated}</p>
        <div className="mt-6 max-w-[65ch] text-[18px] leading-relaxed text-ink/85">{intro}</div>
      </header>

      <ol className="mt-12 md:mt-16 grid gap-10 md:gap-12 max-w-[65ch]">
        {sections.map((s, i) => (
          <li key={s.heading} className="grid gap-3">
            <h2 className="text-[22px] md:text-[24px] font-bold text-ink">
              <span className="text-indigo tabular-nums mr-3">{String(i + 1).padStart(2, '0')}</span>
              {s.heading}
            </h2>
            <div className="text-[17px] leading-relaxed text-ink/85 [&_p+p]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1.5 [&_li]:pl-1 [&_a]:font-semibold [&_a]:text-indigo [&_a]:underline [&_a]:underline-offset-4">
              {s.body}
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}

/** Store facts every policy page quotes, kept in one place. */
export const STORE = {
  name: 'Kuthari Beauty Store',
  address: 'Marthapeta St, near Sano Bazar, Triveni Nagar, Brahmapur, Odisha 760009',
  phones: ['+91 98612 35276'],
  email: 'smortika@gmail.com',
  hours: 'Monday to Saturday, 9 am to 6 pm',
  updated: '4 November 2026',
}
