import type { OrderEmailData } from '../index'
import { CTA, EmailShell, Facts, Hero, Progress, inr } from './_kit'

type Props = OrderEmailData & { siteUrl: string; title: string }

/** Short note to staff on every order status change. */
export default function OrderStatusAdmin({ orderId, orderNumber, address, total, status = '', estimatedDelivery, siteUrl, title }: Props) {
  const tone = status === 'cancelled' ? 'bad' : status === 'returned' ? 'warn' : status === 'delivered' ? 'good' : 'brand'
  return (
    <EmailShell siteUrl={siteUrl} audience="staff" preview={`Order #${orderNumber} is now ${title}.`}>
      <Hero eyebrow="Order update" title={title} accent={`Order #${orderNumber}`} tone={tone} />
      <Progress status={status} />
      <Facts items={[
        { label: 'Customer', value: <>{address?.name ?? '—'}<br />{address?.phone ?? ''}</> },
        { label: 'Total', value: inr(total) },
        ...(estimatedDelivery ? [{ label: 'ETA', value: estimatedDelivery }] : []),
      ]} />
      <CTA href={`${siteUrl}/admin/orders/${orderId}`}>Open order</CTA>
    </EmailShell>
  )
}
