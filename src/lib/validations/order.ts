import { z } from 'zod/v4'

export const placeOrderSchema = z.object({
  address_id: z.string().min(1, 'Select a delivery address'),
  notes: z.string().max(500).optional(),
  is_bulk: z.boolean().default(false),
})

export type PlaceOrderData = z.infer<typeof placeOrderSchema>
