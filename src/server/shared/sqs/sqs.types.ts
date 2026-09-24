export type TS3Notification = {
  Event?: string
  Records?: { s3: { object: { key: string } } }[]
}
