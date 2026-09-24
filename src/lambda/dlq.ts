import { createDocumentsService } from "@/server/app"
import { FAILURE_REASON } from "@/server/modules/documents/documents.constants"
import { fileIdFromOriginalKey } from "@/server/modules/documents/documents.keys"
import { objectKeysFromNotification } from "@/server/shared/sqs/sqs.helpers"

import type { SQSEvent } from "aws-lambda"

const documentsService = createDocumentsService()

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    console.log(
      JSON.stringify({
        stage: "dead",
        messageId: record.messageId,
        receiveCount: record.attributes.ApproximateReceiveCount,
      }),
    )

    for (const key of objectKeysFromNotification(record.body)) {
      const fileId = fileIdFromOriginalKey(key)

      if (!fileId) {
        console.log(JSON.stringify({ stage: "ignored", key }))
        continue
      }

      const outcome = await documentsService.failIfProcessing(
        fileId,
        FAILURE_REASON.retriesExhausted,
      )
      console.log(JSON.stringify({ fileId, stage: "dlq", outcome }))
    }
  }
}
