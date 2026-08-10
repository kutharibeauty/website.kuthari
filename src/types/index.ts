export type { Database } from './database.types'

export interface AuthMetadata {
  role: 'customer' | 'super_admin' | 'admin' | 'delivery'
  supabase_profile_id: string
  admin_profile_id?: string
}