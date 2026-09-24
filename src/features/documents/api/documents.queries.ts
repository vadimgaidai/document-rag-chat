import { queryOptions } from "@tanstack/react-query"

import { DOCUMENT_STATUS, DOCUMENTS_PAGE_SIZE } from "@/contracts"
import { documentsApi } from "@/features/documents/api/documents.api"
import {
  DOCUMENTS_ENTITY,
  DOCUMENTS_QUERY_KEYS,
  PROCESSING_POLL_INTERVAL_MS,
} from "@/features/documents/constants"
import { createQueryKeyFactory } from "@/lib/query/query-key-factory"

export const documentKeys = createQueryKeyFactory(DOCUMENTS_ENTITY, (all) => ({
  list: (cursor?: string) => [...all(), DOCUMENTS_QUERY_KEYS.LIST, cursor ?? null] as const,
  context: (fileId: string, from: number, to: number) =>
    [...all(), DOCUMENTS_QUERY_KEYS.CONTEXT, fileId, from, to] as const,
}))

export const documentQueries = {
  list: (cursor?: string) =>
    queryOptions({
      queryKey: documentKeys.list(cursor),
      queryFn: ({ signal }) => documentsApi.list({ cursor, limit: DOCUMENTS_PAGE_SIZE }, signal),
      refetchInterval: (query) =>
        query.state.data?.documents.some(
          (document) => document.status === DOCUMENT_STATUS.processing,
        )
          ? PROCESSING_POLL_INTERVAL_MS
          : false,
    }),

  context: (fileId: string, from: number, to: number) =>
    queryOptions({
      queryKey: documentKeys.context(fileId, from, to),
      queryFn: ({ signal }) => documentsApi.context(fileId, { from, to }, signal),
      staleTime: Infinity,
    }),
}
