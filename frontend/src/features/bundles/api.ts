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

export type BundleProductScope = 'all' | 'selected'

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
  status: 'active' | 'expired' | 'planned'
  created_at: string
}

export type BundleListResponse = {
  items: BundleListItem[]
  seller: string
  message: string
}

export async function listBundles() {
  return apiRequest<BundleListResponse>('/bundles')
}
