// The feature's public surface. Files inside the feature import each other
// directly — going through this barrel would make a cycle.

export { documentsApi } from "@/features/documents/api/documents.api"
export { useUploadDocument } from "@/features/documents/api/documents.mutations"
export { documentKeys, documentQueries } from "@/features/documents/api/documents.queries"
export { DocumentList } from "@/features/documents/components/document-list"
export { DocumentStatusBadge } from "@/features/documents/components/document-status-badge"
export { UploadDialog } from "@/features/documents/components/upload-dialog"
export {
  DOCUMENTS_ENTITY,
  DOCUMENTS_QUERY_KEYS,
  PROCESSING_POLL_INTERVAL_MS,
  UPLOAD_ITEM_STATE,
} from "@/features/documents/constants"
export { useUploadQueue } from "@/features/documents/hooks/use-upload-queue"
export type {
  TFileRejection,
  TUploadItem,
  TUploadItemState,
  TUploadQueue,
} from "@/features/documents/types"
