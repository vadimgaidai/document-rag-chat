import { PutVectorsCommand, S3VectorsClient } from "@aws-sdk/client-s3vectors"

import type { ConfigService } from "@/server/shared/config/config.service"

import { PUT_BATCH_SIZE } from "./s3-vectors.constants"

import type { TVectorRecord } from "./s3-vectors.types"

export class S3VectorsService {
  private readonly client: S3VectorsClient

  constructor(private readonly config: ConfigService) {
    this.client = new S3VectorsClient({ region: config.region })
  }

  async put(records: readonly TVectorRecord[]): Promise<void> {
    const vectorBucketName = this.config.vectorsBucket
    const indexName = this.config.vectorsIndex

    for (let start = 0; start < records.length; start += PUT_BATCH_SIZE) {
      await this.client.send(
        new PutVectorsCommand({
          vectorBucketName,
          indexName,
          vectors: records.slice(start, start + PUT_BATCH_SIZE).map((record) => ({
            key: record.key,
            data: { float32: record.embedding },
            metadata: record.metadata,
          })),
        }),
      )
    }
  }
}
