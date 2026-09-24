import { z } from "zod"

import { TEST_EVENT } from "./sqs.constants"

import type { TS3Notification } from "./sqs.types"

const notificationSchema = z.object({
  Event: z.string().optional(),
  Records: z
    .array(z.object({ s3: z.object({ object: z.object({ key: z.string() }) }) }))
    .optional(),
}) satisfies z.ZodType<TS3Notification>

// S3 percent-encodes object keys in notifications and encodes spaces as `+`.
const decodeObjectKey = (key: string) => decodeURIComponent(key.replace(/\+/g, " "))

export const objectKeysFromNotification = (body: string): string[] => {
  const notification = notificationSchema.parse(JSON.parse(body))

  if (notification.Event === TEST_EVENT) {
    return []
  }

  return (notification.Records ?? []).map((record) => decodeObjectKey(record.s3.object.key))
}
