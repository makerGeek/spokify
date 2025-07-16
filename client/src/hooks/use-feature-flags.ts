import { useQuery } from '@tanstack/react-query'
import type { FeatureFlag } from '@shared/schema'

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
  })

  return {
    isEnabled: !isLoading && (flag?.enabled ?? false),
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