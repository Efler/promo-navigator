import { useState, type PropsWithChildren } from 'react'
import { useMutation } from '@tanstack/react-query'
import { appConfig } from '../../shared/config/env'
import {
  requestMechanicRecommendation,
  type MechanicRecommendationResponse,
} from './api'
import {
  RecommendationContext,
  type RecommendationMechanicKey,
  type RecommendationView,
} from './recommendation-context'

const recommendationExplanations: Record<
  RecommendationMechanicKey,
  string
> = {
  promotions:
    'Акция лучше всего подходит для заметного роста продаж и работы с широким ассортиментом. Она поможет привлечь больше внимания к товарам за счёт участия в общей кампании маркетплейса.',
  promocodes:
    'Промокод подойдёт для адресного предложения: его удобно использовать для возврата покупателей, ограниченной аудитории или отдельной рекламной коммуникации.',
  bundles:
    'Комплекты помогут связать несколько товаров в одно предложение, увеличить средний чек и стимулировать покупку дополнительных позиций.',
}

function getDemoRecommendation(request: string): RecommendationView {
  const normalizedRequest = request.toLocaleLowerCase('ru-RU')

  if (
    ['комплект', 'набор', 'средн', 'дополнительн', 'вместе', 'чек'].some(
      (keyword) => normalizedRequest.includes(keyword),
    )
  ) {
    return {
      resultType: 'recommendation',
      mechanicKey: 'bundles',
      explanation: recommendationExplanations.bundles,
      source: 'demo',
    }
  }

  if (
    [
      'промокод',
      'вернуть',
      'повторн',
      'постоянн',
      'аудитори',
      'лояльн',
    ].some((keyword) => normalizedRequest.includes(keyword))
  ) {
    return {
      resultType: 'recommendation',
      mechanicKey: 'promocodes',
      explanation: recommendationExplanations.promocodes,
      source: 'demo',
    }
  }

  return {
    resultType: 'recommendation',
    mechanicKey: 'promotions',
    explanation: recommendationExplanations.promotions,
    source: 'demo',
  }
}

function mapApiRecommendation(
  response: MechanicRecommendationResponse,
): RecommendationView {
  if (
    response.result_type === 'clarification_required' ||
    response.mechanic_code === 'none'
  ) {
    return {
      resultType: 'clarification_required',
      mechanicKey: null,
      explanation: response.message,
      source: 'llm',
    }
  }

  return {
    resultType: 'recommendation',
    mechanicKey: response.mechanic_code,
    explanation: response.message,
    source: 'llm',
  }
}

export function RecommendationProvider({ children }: PropsWithChildren) {
  const [request, setRequest] = useState('')
  const [recommendation, setRecommendation] =
    useState<RecommendationView | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const recommendationMutation = useMutation({
    mutationFn: requestMechanicRecommendation,
    onSuccess: (response) => {
      setRecommendation(mapApiRecommendation(response))
      setStartedAt(null)
    },
    onError: () => {
      setStartedAt(null)
    },
  })

  function clearResult() {
    recommendationMutation.reset()
    setRecommendation(null)
  }

  function runRecommendation(preparedRequest: string) {
    clearResult()

    if (!appConfig.llmRecommendationsEnabled) {
      setRecommendation(getDemoRecommendation(preparedRequest))
      setStartedAt(null)
      return
    }

    setStartedAt(Date.now())
    recommendationMutation.mutate(preparedRequest)
  }

  function useDemoFallback() {
    recommendationMutation.reset()
    setRecommendation(getDemoRecommendation(request.trim()))
    setStartedAt(null)
  }

  return (
    <RecommendationContext.Provider
      value={{
        request,
        recommendation,
        isPending: recommendationMutation.isPending,
        error: recommendationMutation.error,
        startedAt,
        setRequest,
        runRecommendation,
        clearResult,
        useDemoFallback,
      }}
    >
      {children}
    </RecommendationContext.Provider>
  )
}
