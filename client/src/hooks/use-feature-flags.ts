import { useQuery } from '@tanstack/react-query'
import type { FeatureFlag } from '@shared/schema'
import { REAL_TIME_CONFIG } from '@/lib/query-config'
import { api } from '@/lib/api-client'

export function useFeatureFlag(flagName: string) {
  const { data: flag, isLoading, error } = useQuery({
    queryKey: ['feature-flags', flagName],
    queryFn: (): Promise<FeatureFlag> => api.featureFlags.get(flagName),
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
    queryFn: (): Promise<FeatureFlag[]> => api.featureFlags.getAll(),
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