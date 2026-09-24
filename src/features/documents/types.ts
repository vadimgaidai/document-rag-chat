import type { UPLOAD_ITEM_STATE } from "@/features/documents/constants"

import type { FileRejection } from "react-dropzone"

/** What react-dropzone reports a refused file as; its own type, not a copy. */
export type TFileRejection = FileRejection

export type TUploadItemState = (typeof UPLOAD_ITEM_STATE)[keyof typeof UPLOAD_ITEM_STATE]

/** One file the user picked, tracked from selection until it leaves the queue. */
export type TUploadItem = {
  id: string
  name: string
  file: File
  state: TUploadItemState
  /** Bytes sent to the bucket, 0–100. */
  progress: number
  error?: string
  /** A file the browser itself refused is refused the same way every time. */
  canRetry: boolean
}

export type TUploadQueue = {
  items: TUploadItem[]
  pendingCount: number
  add: (accepted: readonly File[], rejected?: readonly TFileRejection[]) => void
  retry: (id: string) => void
  dismiss: (id: string) => void
  clear: () => void
}
