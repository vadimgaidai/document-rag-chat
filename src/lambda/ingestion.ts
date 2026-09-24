import { createIngestionService } from "@/server/app"
import { fileIdFromOriginalKey } from "@/server/modules/documents/documents.keys"
import { objectKeysFromNotification } from "@/server/shared/sqs/sqs.helpers"

import type { SQSEvent } from "aws-lambda"

const ingestionService = createIngestionService()

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    console.log(
      JSON.stringify({
        stage: "receive",
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

      await ingestionService.ingest(fileId)
    }
  }
}
