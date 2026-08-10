export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Domain interfaces ──────────────────────────────────────────────────────

export type BannerPlacement = 'hero' | 'mid_page' | 'category' | 'product'

export interface Banner {
  id: string
  title: string | null
  title_or: string | null
  subtitle: string | null
  subtitle_or: string | null
  image_url: string | null
  mobile_image_url: string | null
  link_url: string | null
  cta_text: string | null
  cta_text_or: string | null
  background_color: string
  text_color: string
  placement: BannerPlacement
  display_order: number
  /**
   * Seconds this banner stays on screen before the carousel advances
   * (migration 029). Optional: absent until that migration runs on the live DB,
   * in which case the carousel falls back to its previous fixed 5s.
   */
  display_seconds?: number | null
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  name_or: string | null
  slug: string
  image_url: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  parent_id: string | null
  created_at: string
}

// Outer packaging the wholesaler sells a product as (matches the Vyapar sheet's
// "Unit" column: BOX / PACKS / BAGS / CANS / Hanger / PIECES / BOTTLES).
export type PackType = 'Box' | 'Box/Bale' | 'Bag' | 'Tin/Can' | 'Hanger' | 'Piece' | 'Pack' | 'Bottle'
// What a single unit inside a pack is called. Free-form — many values in use
// (Bag, Piece, Bottle/Pouch, Tin/Can, Bottle, Pouch, Jar, Tin, Pack, Sachet, …).
export type UnitType = string

/** A selectable weight/size option, e.g. { label: '10kg', price: 480, mrp: 520 }. */
export interface ProductVariant {
  label: string
  price: number
  mrp: number | null
}

export interface Product {
  id: string
  name: string
  name_or: string | null
  slug: string
  description: string | null
  description_or: string | null
  price: number
  mrp: number | null
  unit: string
  unit_or: string | null
  images: string[]
  category_id: string | null
  is_featured: boolean
  is_active: boolean
  display_order: number
  stock_qty: number
  sku: string | null
  tags: string[] | null
  meta_title: string | null
  meta_description: string | null
  brand: string | null
  packaging_form: string | null
  // Packaging: pack_type = biggest unit sold (Box); unit_type = the lower unit a
  // customer may also buy (Hanger/Pack/Tin); units_per_pack = how many lower
  // units per box; pieces_per_secondary = pieces inside one lower unit.
  pack_type: PackType | null
  units_per_pack: number | null
  pieces_per_secondary: number | null
  /** Optional price for one lower unit; derived from price ÷ units_per_pack when null. */
  secondary_price: number | null
  secondary_mrp: number | null
  // Legacy box → pack → unit split (kept for backward compatibility).
  packs_per_box: number | null
  unit_type: UnitType | null
  price_per_pack: number | null
  // Spices only: buyer picks hangers/packs. `price` is the per-hanger price;
  // pack price = hangers_per_pack × price. Null for non-spice products.
  units_per_hanger: number | null
  hangers_per_pack: number | null
  // Optional per-product delivery charge (₹), applied only when enabled.
  delivery_charge: number | null
  delivery_charge_enabled: boolean
  variants: ProductVariant[]
  created_at: string
  updated_at: string
  // When the CURRENT price took effect (migration 027). Optional: absent until
  // that migration runs on the live DB, so JSON-LD omits validFrom rather than
  // inventing one.
  price_updated_at?: string | null
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  description_or: string | null
  /**
   * Optional custom line for the homepage coupon ticker (migration 030). When
   * set it replaces the auto-composed "20% OFF · description" half of the item;
   * the code itself is always shown. Optional here because the column is absent
   * until that migration runs on the live DB.
   */
  marquee_message?: string | null
  marquee_message_or?: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  /** Global cap across ALL customers (uses_count tracks the running total). */
  max_uses: number | null
  /**
   * Cap for a SINGLE customer (migration 031). Counted from that customer's own
   * orders. null = no per-customer limit. Optional because the column is absent
   * until that migration runs on the live DB.
   */
  max_uses_per_customer?: number | null
  uses_count: number
  created_at: string
}

export interface ProductFAQ {
  id: string
  product_id: string
  question: string
  question_or: string | null
  answer: string
  answer_or: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface ProductReview {
  id: string
  product_id: string
  reviewer_name: string
  rating: number
  body: string | null
  body_or: string | null
  is_approved: boolean
  created_at: string
}

export interface CmsContent {
  id: string
  key: string
  value: Json
  // Optional: absent on the drifted live cms_content table — never require it on write.
  is_active?: boolean
  updated_at?: string
}

// ── Address ────────────────────────────────────────────────────────────────

export type AddressLabel = 'Home' | 'Office' | 'Storefront' | 'Other'

export interface Address {
  id: string
  user_id: string
  name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  label: AddressLabel | null
  is_default: boolean
  created_at: string
}

// ── Order ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  product_id: string
  name: string
  price: number
  mrp: number | null
  quantity: number
  unit: string
  image: string | null
  // Total stock units this line consumes (spices: quantity × units per hanger/
  // pack; otherwise = quantity). Drives stock decrement/restore. Optional for
  // backward compatibility with orders placed before this field existed.
  stock_units?: number
}

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipping' | 'delivered' | 'cancelled' | 'returned'

export interface DeliveryVehicle {
  id: string
  number: string
  name: string | null
  phone: string | null
  is_active: boolean
  display_order: number
  created_at?: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  items: OrderItem[]
  address: Address
  subtotal: number
  delivery_fee: number
  discount?: number
  coupon_code?: string | null
  total: number
  status: OrderStatus
  payment_method: 'cod'
  notes: string | null
  /** Bus/transport chosen at checkout (migration 034). Text snapshot. */
  transport_details?: string | null
  is_bulk: boolean
  estimated_delivery?: string | null
  custom_message?: string | null
  returned_at?: string | null
  gstin?: string | null
  gst_business_name?: string | null
  created_at: string
  updated_at: string
}

// ── CMS value shapes ───────────────────────────────────────────────────────

export interface SiteAnnouncement {
  text: string
  background_color: string
  text_color: string
  link_url?: string
}

export interface OfferBannerConfig {
  image_url: string
  link_url: string
  alt_text: string
}

// ── Cart ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string              // unique cart line key — productId, or `${productId}::${variant}`
  product_id?: string     // real product id (falls back to `id` when absent)
  variant?: string | null // selected variant label, if any
  units_each?: number     // units contained in one purchased item (box/hanger/pack), if applicable
  name: string
  price: number
  mrp: number | null
  unit: string
  image: string | null
  quantity: number
  slug: string
  delivery_charge?: number  // per-product delivery charge (₹), 0 when none/disabled
}

// ── Supabase Database type ─────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          name: string | null
          role: 'customer' | 'super_admin' | 'admin' | 'delivery'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      admin_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          role: 'super_admin' | 'admin' | 'delivery'
          permissions: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_profiles']['Insert']>
      }
      banners: {
        Row: Banner
        Insert: Omit<Banner, 'id' | 'created_at'>
        Update: Partial<Omit<Banner, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      coupons: {
        Row: Coupon
        Insert: Omit<Coupon, 'id' | 'created_at' | 'uses_count'>
        Update: Partial<Omit<Coupon, 'id' | 'created_at'>>
      }
      cms_content: {
        Row: CmsContent
        Insert: Omit<CmsContent, 'id' | 'updated_at'>
        Update: Partial<Omit<CmsContent, 'id'>>
      }
    }
  }
}
