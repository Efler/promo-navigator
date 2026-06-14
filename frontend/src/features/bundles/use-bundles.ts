import { useQuery } from '@tanstack/react-query'
import { listBundles } from './api'

export function useBundlesQuery() {
  return useQuery({
    queryKey: ['bundles'],
    queryFn: listBundles,
  })
}
