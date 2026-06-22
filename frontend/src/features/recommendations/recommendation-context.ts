import { createContext } from 'react'

export type RecommendationMechanicKey =
  | 'promotions'
  | 'promocodes'
  | 'bundles'

export type RecommendationView = {
  resultType: 'recommendation' | 'clarification_required'
  mechanicKey: RecommendationMechanicKey | null
  explanation: string
  source: 'llm' | 'demo'
}

export type RecommendationContextValue = {
  request: string
  recommendation: RecommendationView | null
  isPending: boolean
  error: Error | null
  startedAt: number | null
  setRequest: (value: string) => void
  runRecommendation: (preparedRequest: string) => void
  clearResult: () => void
  useDemoFallback: () => void
}

export const RecommendationContext =
  createContext<RecommendationContextValue | null>(null)
