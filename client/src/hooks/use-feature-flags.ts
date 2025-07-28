import { useQuery } from '@tanstack/react-query'
import type { FeatureFlag } from '@shared/schema'
import { REAL_TIME_CONFIG } from '@/lib/query-config'
import { api } from '@/lib/api-client'

export function useFeatureFlag(flagName: string) {
  const { data: activeFlags, isLoading, error } = useQuery({
    queryKey: ['active-flags'],
    queryFn: (): Promise<string[]> => api.featureFlags.getActive(),
    ...REAL_TIME_CONFIG
  })

  const isEnabled = !isLoading && (activeFlags ? activeFlags.includes(flagName) : false)

  return {
    isEnabled,
    isLoading,
    error,
  }
}

export function useFeatureFlags() {
  const { data: activeFlags, isLoading, error } = useQuery({
    queryKey: ['active-flags'],
    queryFn: (): Promise<string[]> => api.featureFlags.getActive(),
    ...REAL_TIME_CONFIG
  })

  return {
    activeFlags: activeFlags ?? [],
    isLoading,
    error,
    isEnabled: (flagName: string) => {
      return activeFlags ? activeFlags.includes(flagName) : false
    },
  }
}