function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }

  return value.toLowerCase() === 'true'
}

export const appConfig = {
  name: 'Promo Navigator',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/ui-api/v1',
  llmRecommendationsEnabled: readBooleanEnv(
    import.meta.env.VITE_LLM_RECOMMENDATIONS_ENABLED,
    true,
  ),
}
