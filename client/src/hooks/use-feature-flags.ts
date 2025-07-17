import { useQuery } from '@tanstack/react-query'
import type { FeatureFlag } from '@shared/schema'
import { REAL_TIME_CONFIG } from '@/lib/query-config'

export function useFeatureFlag(flagName: string) {
  const { data: flag, isLoading, error } = useQuery({
    queryKey: ['feature-flags', flagName],
    queryFn: async (): Promise<FeatureFlag> => {
      const response = await fetch(`/api/feature-flags/${flagName}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feature flag')
      }
      return response.json()
    },
    ...REAL_TIME_CONFIG
  })

  const isEnabled = !isLoading && (flag?.enabled ?? false)

  return {
    isEnabled,
    flag,
    isLoading,
    error,
  }
}

export function useFeatureFlags() {
  const { data: flags, isLoading, error } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const response = await fetch('/api/feature-flags')
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }
      return response.json()
    },
    ...REAL_TIME_CONFIG
  })

  return {
    flags: flags ?? [],
    isLoading,
    error,
    isEnabled: (flagName: string) => {
      const flag = flags?.find(f => f.name === flagName)
      return flag?.enabled ?? false
    },
  }
}