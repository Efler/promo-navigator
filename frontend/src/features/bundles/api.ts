import { apiRequest } from '../../shared/api/client'

export type BundleBenefitType =
  | 'gift_item'
  | 'order_discount'
  | 'fixed_price'
  | 'step_discount'
  | 'pair_discount'

export type BundleAudienceType =
  | 'all'
  | 'bought_last_half_year'
  | 'not_bought_last_half_year'

export type BundleProductScope = 'all' | 'selected' | 'pair'

export type BundleProductRole = 'eligible' | 'pair_x' | 'pair_y'
export type BundleStatus = 'active' | 'expired' | 'planned'

export type BundleProductSummary = {
  id: number
  title: string
  role: BundleProductRole
}

export type BundleCreatePayload = {
  title: string
  starts_on: string
  ends_on: string
  benefit_type: BundleBenefitType
  audience_type: BundleAudienceType
  product_scope: BundleProductScope
  selected_product_ids: number[]
  buy_quantity: number | null
  gift_quantity: number | null
  order_discount_percent: number | null
  fixed_price: number | null
  step_start_position: number | null
  step_discount_percent: number | null
  pair_discount_percent: number | null
  pair_product_x_id: number | null
  pair_product_y_id: number | null
}

export type BundleListItem = {
  id: number
  title: string
  starts_on: string
  ends_on: string
  benefit_type: BundleBenefitType
  benefit_label: string
  audience_type: BundleAudienceType
  product_scope: BundleProductScope
  selected_product_ids: number[]
  products: BundleProductSummary[]
  status: BundleStatus
  created_at: string
}

export type BundleRead = BundleListItem & {
  seller_id: number
  buy_quantity: number | null
  gift_quantity: number | null
  order_discount_percent: number | null
  fixed_price: string | null
  step_start_position: number | null
  step_discount_percent: number | null
  pair_discount_percent: number | null
  updated_at: string
}

export type BundleCreateResponse = {
  message: string
  bundle: BundleRead
}

export async function createBundle(payload: BundleCreatePayload) {
  return apiRequest<BundleCreateResponse>('/bundles', {
    method: 'POST',
    body: payload,
  })
}

export async function listBundles() {
  return apiRequest<BundleListItem[]>('/bundles')
}
