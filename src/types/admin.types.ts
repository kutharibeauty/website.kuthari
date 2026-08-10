export interface AdminPermissions {
  view_orders: boolean
  update_order_status: boolean
  manage_products: boolean
  manage_categories: boolean
  manage_banners: boolean
  manage_coupons: boolean
  manage_pincodes: boolean
  manage_cms: boolean
  manage_admin_profiles: boolean
  manage_delivery_persons: boolean
  view_analytics: boolean
  view_abandoned_carts: boolean
  view_unserviceable: boolean
  receive_order_emails: boolean
  export_data: boolean
}

export interface AdminProfile {
  id: string
  user_id: string | null
  phone: string
  name: string
  email: string | null
  role: 'super_admin' | 'admin' | 'delivery'
  is_active: boolean
  permissions: AdminPermissions
  created_by: string | null
  created_at: string
  updated_at: string
}

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  view_orders: true,
  update_order_status: true,
  manage_products: false,
  manage_categories: false,
  manage_banners: false,
  manage_coupons: false,
  manage_pincodes: false,
  manage_cms: false,
  manage_admin_profiles: false,
  manage_delivery_persons: false,
  view_analytics: true,
  view_abandoned_carts: true,
  view_unserviceable: true,
  receive_order_emails: true,
  export_data: false,
}

export const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  view_orders: 'View Orders',
  update_order_status: 'Update Order Status',
  manage_products: 'Manage Products',
  manage_categories: 'Manage Categories',
  manage_banners: 'Manage Banners',
  manage_coupons: 'Manage Coupons',
  manage_pincodes: 'Manage Serviceable Pincodes',
  manage_cms: 'Manage CMS Content',
  manage_admin_profiles: 'Manage Admin Profiles',
  manage_delivery_persons: 'Manage Delivery Persons',
  view_analytics: 'View Analytics',
  view_abandoned_carts: 'View Abandoned Carts',
  view_unserviceable: 'View Unserviceable Attempts',
  receive_order_emails: 'Receive Order Emails',
  export_data: 'Export Data (CSV)',
}
