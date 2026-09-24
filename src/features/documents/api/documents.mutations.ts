import { useMutation, useQueryClient } from "@tanstack/react-query"

import { documentsApi } from "@/features/documents/api/documents.api"
import { documentKeys } from "@/features/documents/api/documents.queries"

type TUploadVariables = {
  file: File
  onProgress?: (percent: number) => void
}

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
