import { useContext } from 'react'
import { RecommendationContext } from './recommendation-context'

export function useRecommendation() {
  const context = useContext(RecommendationContext)

  if (!context) {
    throw new Error(
      'useRecommendation must be used inside RecommendationProvider.',
    )
  }

  return context
}
