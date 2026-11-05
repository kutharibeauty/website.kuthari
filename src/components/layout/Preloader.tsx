import Logo from './Logo'

const LETTERS = 'KUTHARI'.split('')

/**
 * The curtain's styles ship inline with its markup, so it can never paint
 * unstyled: the first frame of the page has them before any stylesheet loads.
 */
const CSS = `@property --kbs-n {
  syntax: '<integer>';
  initial-value: 0;
  inherits: false;
}
@keyframes kbs-count {
  to {
    --kbs-n: 100;
  }
}
@keyframes kbs-lift {
  0% {
    transform: translate3d(0, 0, 0);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  100% {
    transform: translate3d(0, -110%, 0);
    border-bottom-left-radius: 50% 18%;
    border-bottom-right-radius: 50% 18%;
    visibility: hidden;
  }
}
@keyframes kbs-letter {
  from {
    transform: translate3d(0, 105%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes kbs-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 40px, 0) rotate(-14deg) scale(0.86);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(-4deg) scale(1);
  }
}
@keyframes kbs-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.kbs-preloader {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: var(--color-ink, #292966);
  color: var(--color-paper-raised, #FDFDFF);
  pointer-events: none;
  animation: kbs-lift 0.6s cubic-bezier(0.76, 0, 0.24, 1) 1.25s forwards;
}
.kbs-preloader__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.kbs-preloader__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(84px, 14vw, 120px);
  height: clamp(84px, 14vw, 120px);
  padding: 14px;
  border-radius: 9999px;
  background: var(--color-paper-raised, #FDFDFF);
  animation: kbs-rise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.kbs-preloader__word {
  display: flex;
  overflow: hidden;
  margin-top: 18px;
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 2rem + 7vw, 7.5rem);
  line-height: 1.02;
  letter-spacing: 0.02em;
}
.kbs-preloader__word span {
  display: inline-block;
  animation: kbs-letter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.kbs-preloader__line {
  margin-top: 6px;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(1.4rem, 1rem + 1.6vw, 2.2rem);
  color: var(--color-periwinkle, #CCCCFF);
  animation: kbs-fade 0.5s ease-out 0.45s both;
}
.kbs-preloader__count {
  position: absolute;
  left: clamp(20px, 4vw, 48px);
  bottom: clamp(16px, 3vw, 36px);
  font-family: var(--font-display);
  font-size: clamp(3rem, 2rem + 5vw, 6rem);
  line-height: 1;
  color: var(--color-periwinkle, #CCCCFF);
  font-variant-numeric: tabular-nums;
  animation: kbs-count 1.1s cubic-bezier(0.33, 0, 0.2, 1) forwards;
  counter-reset: kbs var(--kbs-n);
}
.kbs-preloader__count::after {
  content: counter(kbs, decimal-leading-zero);
}
.kbs-preloader__place {
  position: absolute;
  right: clamp(20px, 4vw, 48px);
  bottom: clamp(22px, 3.4vw, 44px);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-lavender, #A3A3CC);
}
@keyframes kbs-fade-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kbs-preloader {
    animation: kbs-fade-out 0.4s linear 1s forwards !important;
  }
  .kbs-preloader *,
  .kbs-preloader__count {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
  .kbs-preloader__count {
    --kbs-n: 100;
  }
}`

/**
 * The opening curtain on every full page load (client-side navigation keeps
 * the layout mounted, so moving between pages doesn't replay it): a
 * deep-indigo panel where the mirror logo rises, KUTHARI reveals letter by
 * letter and a counter runs 000 to 100, then the panel lifts away.
 *
 * CSS only (inline below): it always finishes even if a script
 * fails and never waits on data. Under reduced motion it still shows, as a
 * plain fade with nothing moving.
 */
export default function Preloader() {
  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <div className="kbs-preloader" aria-hidden="true">
      <div className="kbs-preloader__inner">
        <span className="kbs-preloader__mark">
          <Logo className="h-full w-auto" sizes="96px" priority />
        </span>
        <p className="kbs-preloader__word">
          {LETTERS.map((l, i) => (
            <span key={i} style={{ animationDelay: `${120 + i * 55}ms` }}>
              {l}
            </span>
          ))}
        </p>
        <p className="kbs-preloader__line">polishing the mirror…</p>
      </div>
      <span className="kbs-preloader__count" />
      <span className="kbs-preloader__place">Beauty store, Brahmapur</span>
    </div>
    </>
  )
}
