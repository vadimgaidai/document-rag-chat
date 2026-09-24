//! Runs ingestion pipeline against real develop bucket, skipping queue

import { createIngestionService } from "@/server/app"

const [fileId] = process.argv.slice(2)

if (!fileId) {
  console.error("usage: pnpm ingest:local <fileId>")
  process.exit(1)
}

const startedAt = Date.now()
const outcome = await createIngestionService().ingest(fileId)

console.log(JSON.stringify({ fileId, outcome, totalSeconds: (Date.now() - startedAt) / 1000 }))
