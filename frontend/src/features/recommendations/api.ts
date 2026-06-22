import { apiRequest } from '../../shared/api/client'

export type RecommendationResultType =
  | 'recommendation'
  | 'clarification_required'

export type RecommendationMechanicCode =
  | 'promotions'
  | 'promocodes'
  | 'bundles'
  | 'none'

export type MechanicRecommendationResponse = {
  result_type: RecommendationResultType
  mechanic_code: RecommendationMechanicCode
  message: string
}

export async function requestMechanicRecommendation(sellerNeed: string) {
  return apiRequest<MechanicRecommendationResponse>(
    '/recommendations/mechanic',
    {
      method: 'POST',
      body: {
        seller_need: sellerNeed,
      },
    },
  )
}
