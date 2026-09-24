import { useMutation, useQueryClient } from "@tanstack/react-query"

import { API_ERROR_CODE } from "@/contracts"
import { documentsApi } from "@/features/documents/api/documents.api"
import { documentKeys } from "@/features/documents/api/documents.queries"
import { ApiError } from "@/lib/api/client"

type TUploadVariables = {
  file: File
  onProgress?: (percent: number) => void
}

const isAlreadyDeleted = (error: unknown) =>
  error instanceof ApiError && error.code === API_ERROR_CODE.notFound

export const useUploadDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, onProgress }: TUploadVariables) => {
      const { fileId, upload } = await documentsApi.createUpload({
        name: file.name,
        sizeBytes: file.size,
      })

      await documentsApi.postToBucket(upload, file, onProgress)
      return { fileId }
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: documentKeys.all() }),
  })
}

export const useDeleteDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fileId: string) => {
      try {
        return await documentsApi.remove(fileId)
      } catch (error) {
        if (isAlreadyDeleted(error)) {
          return { fileId }
        }
        throw error
      }
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: documentKeys.all() }),
  })
}
