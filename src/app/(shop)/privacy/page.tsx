import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { getStoreContent } from '@/lib/data/store-content'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Kuthari Beauty Store collects when you shop, why, who it is shared with, and how to have it removed.',
  alternates: { canonical: '/privacy' },
}

export default async function PrivacyPage() {
  const { contact } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '4 November 2026' }
  return (
    <LegalPage
      title="Privacy policy"
      accent="your details stay yours."
      updated={STORE.updated}
      intro={
        <p>
          This page explains what {STORE.name} collects when you use this website, what we use it for and who else
          sees it. We collect only what we need to sell to you and deliver your order.
        </p>
      }
      sections={[
        {
          heading: 'What we collect',
          body: (
            <ul>
              <li>Your name, mobile number and email address, when you sign in and check out.</li>
              <li>The delivery addresses you save, and the pincode you check.</li>
              <li>Your orders, bag, wishlist and shopping list, and any reviews you write.</li>
              <li>A GST number and business name, only if you ask for a GST invoice.</li>
              <li>Basic technical data such as error reports, so we can fix problems on the site.</li>
            </ul>
          ),
        },
        {
          heading: 'What we use it for',
          body: (
            <ul>
              <li>To sign you in with a one-time code sent to your phone.</li>
              <li>To take payment, pack and deliver your order, and send you its invoice and updates.</li>
              <li>To answer your questions and sort out any problem with an order.</li>
              <li>To keep accounts and meet our tax and legal duties.</li>
            </ul>
          ),
        },
        {
          heading: 'Payments',
          body: (
            <p>
              Payments are handled by Razorpay. Your card, UPI and bank details go straight to Razorpay and are never
              stored on our servers. We only keep the payment reference and the amount.
            </p>
          ),
        },
        {
          heading: 'Who we share it with',
          body: (
            <>
              <p>We don&apos;t sell your data. We share it only with the services that run the shop for us:</p>
              <ul>
                <li>Razorpay, to take payment.</li>
                <li>Our delivery staff and partners, who need your name, phone and address to deliver.</li>
                <li>Message Central, to send sign-in codes by SMS.</li>
                <li>Resend, to send order emails.</li>
                <li>Supabase and Vercel, which store and host the site.</li>
              </ul>
              <p>We may also share information when the law requires it.</p>
            </>
          ),
        },
        {
          heading: 'Cookies',
          body: (
            <p>
              We use cookies to keep you signed in and to remember your bag and pincode on this device. We don&apos;t
              use advertising cookies.
            </p>
          ),
        },
        {
          heading: 'How long we keep it',
          body: (
            <p>
              We keep order and invoice records for as long as tax law requires. You can ask us to delete your
              account and saved addresses at any time.
            </p>
          ),
        },
        {
          heading: 'Your choices',
          body: (
            <p>
              You can update your name, email and addresses from your profile. To see the data we hold about you, or
              to have it corrected or deleted, write to <a href={`mailto:${STORE.email}`}>{STORE.email}</a> from the
              email on your account, or call {STORE.phones[0]}.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              {STORE.name}, {STORE.address}. <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            </p>
          ),
        },
      ]}
    />
  )
}
