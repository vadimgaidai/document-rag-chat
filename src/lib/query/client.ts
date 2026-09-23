import { QueryClient } from "@tanstack/react-query"

const MAX_RETRIES = 2

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined
  }
  const candidate = error as {
    status?: unknown
    response?: { status?: unknown }
  }
  if (typeof candidate.status === "number") {
    return candidate.status
  }
  if (typeof candidate.response?.status === "number") {
    return candidate.response.status
  }
  return undefined
}

const isRetryableError = (error: unknown): boolean => {
  const status = statusOf(error)
  if (status === undefined) {
    return true
  }
  if (status === 408 || status === 429) {
    return true
  }
  return status >= 500
}

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => isRetryableError(error) && failureCount < MAX_RETRIES,
      },
      mutations: {
        retry: false,
      },
    },
  })
