import { useState } from "react"

import {
  API_ERROR_CODE,
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_LIBRARY_FILES,
} from "@/contracts"
import { useUploadDocument } from "@/features/documents/api/documents.mutations"
import { UPLOAD_ITEM_STATE } from "@/features/documents/constants"
import type { TFileRejection, TUploadItem, TUploadQueue } from "@/features/documents/types"
import { ApiError } from "@/lib/api/client"
import { m } from "@/paraglide/messages"

const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024)

const DROPZONE_ERROR = {
  invalidType: "file-invalid-type",
  tooLarge: "file-too-large",
  tooMany: "too-many-files",
} as const

const rejectionMessage = (rejection: TFileRejection) => {
  const name = rejection.file.name
  const codes = rejection.errors.map((error) => error.code)

  if (codes.includes(DROPZONE_ERROR.tooLarge)) {
    return m.documents_error_size({ name, maxMb: MAX_FILE_MB })
  }
  if (codes.includes(DROPZONE_ERROR.tooMany)) {
    return m.documents_error_batch({ name, maxFiles: MAX_FILES_PER_UPLOAD })
  }
  if (codes.includes(DROPZONE_ERROR.invalidType)) {
    return m.documents_error_type({ name })
  }
  return m.documents_error_generic({ name })
}

const uploadErrorMessage = (error: unknown, name: string) => {
  if (error instanceof ApiError) {
    if (error.code === API_ERROR_CODE.limitReached) {
      return m.documents_error_library_full({ name, maxLibrary: MAX_LIBRARY_FILES })
    }
    if (error.code === API_ERROR_CODE.tooLarge) {
      return m.documents_error_size({ name, maxMb: MAX_FILE_MB })
    }
    if (error.code === API_ERROR_CODE.invalidType) {
      return m.documents_error_type({ name })
    }
  }
  return m.documents_error_generic({ name })
}

export const useUploadQueue = (): TUploadQueue => {
  const [items, setItems] = useState<TUploadItem[]>([])
  const uploadDocument = useUploadDocument()

  const patch = (id: string, changes: Partial<TUploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }

  const run = async (queued: readonly TUploadItem[]) => {
    for (const item of queued) {
      patch(item.id, { state: UPLOAD_ITEM_STATE.uploading, progress: 0, error: undefined })
      try {
        await uploadDocument.mutateAsync({
          file: item.file,
          onProgress: (progress) => {
            patch(item.id, { progress })
          },
        })

        setItems((current) => current.filter((entry) => entry.id !== item.id))
      } catch (error) {
        patch(item.id, {
          state: UPLOAD_ITEM_STATE.failed,
          error: uploadErrorMessage(error, item.name),
          canRetry: true,
        })
      }
    }
  }

  const add = (accepted: readonly File[], rejected: readonly TFileRejection[] = []) => {
    const refused: TUploadItem[] = rejected.map((rejection) => ({
      id: crypto.randomUUID(),
      name: rejection.file.name,
      file: rejection.file,
      state: UPLOAD_ITEM_STATE.failed,
      progress: 0,
      error: rejectionMessage(rejection),
      canRetry: false,
    }))

    const queued: TUploadItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      file,
      state: UPLOAD_ITEM_STATE.queued,
      progress: 0,
      canRetry: false,
    }))

    setItems((current) => [...current, ...refused, ...queued])
    void run(queued)
  }

  const retry = (id: string) => {
    const item = items.find((entry) => entry.id === id)
    if (item) {
      void run([item])
    }
  }

  const dismiss = (id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id))
  }

  const clear = () => {
    setItems([])
  }

  const pendingCount = items.filter(
    (item) => item.state === UPLOAD_ITEM_STATE.queued || item.state === UPLOAD_ITEM_STATE.uploading,
  ).length

  return { items, pendingCount, add, retry, dismiss, clear }
}
