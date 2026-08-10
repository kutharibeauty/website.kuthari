import { redirect } from 'next/navigation'

// The orders list is the dashboard
export default function DeliveryOrdersPage() {
  redirect('/delivery/dashboard')
}
