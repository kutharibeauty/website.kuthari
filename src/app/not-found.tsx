import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-[max(884px,100dvh)] flex flex-col items-center justify-center relative overflow-hidden w-full">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-surface-container-high rounded-full opacity-50 blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-surface-container-low rounded-full opacity-60 blur-3xl transform translate-x-1/4 translate-y-1/4" />
      </div>

      <main className="z-10 w-full max-w-[1280px] px-margin-mobile md:px-margin-desktop flex flex-col items-center text-center">
        {/* Illustration */}
        <div className="mb-12 relative group">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant shadow-lg transition-transform duration-500 ease-out group-hover:scale-105">
            <span
              className="material-symbols-outlined text-[100px] md:text-[140px] text-primary transition-colors duration-300 group-hover:text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              inventory_2
            </span>
          </div>
          <div className="absolute -bottom-4 -right-4 bg-error text-on-error px-4 py-2 rounded-full font-label-sm text-label-sm shadow-md animate-bounce">
            404 ERROR
          </div>
        </div>

        {/* Heading & description */}
        <div className="space-y-6 max-w-2xl mx-auto">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary">
            Page Not Found
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant px-4">
            We&apos;re sorry, but the page you are looking for doesn&apos;t exist or has been moved.
            Please check the URL or navigate back to our main trading hub.
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/"
            className="bg-primary hover:bg-primary-container text-on-primary px-8 py-4 rounded-full font-label-sm text-label-sm uppercase tracking-wider transition-colors duration-300 ease-in-out shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Go Back to Home
          </Link>
          <Link
            href="/contact"
            className="bg-transparent border-[1.5px] border-primary text-primary hover:bg-surface-container px-8 py-4 rounded-full font-label-sm text-label-sm uppercase tracking-wider transition-colors duration-300 ease-in-out flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            Contact Support
          </Link>
        </div>

        {/* Branding */}
        <div className="mt-24 pt-8 border-t border-outline-variant w-full max-w-sm mx-auto flex items-center justify-center opacity-70">
          <span className="font-headline-md text-headline-md font-bold text-on-surface-variant tracking-tight">
            Kuthari Beauty Store
          </span>
        </div>
      </main>
    </div>
  )
}
