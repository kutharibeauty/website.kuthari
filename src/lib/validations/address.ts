import { z } from 'zod/v4'

export const addressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().min(5, 'Address too short').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  label: z.enum(['Home', 'Office', 'Storefront', 'Other']).optional(),
  is_default: z.boolean().default(false),
})

export type AddressFormData = z.infer<typeof addressSchema>
