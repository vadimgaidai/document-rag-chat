import { DocumentsService } from "./modules/documents/documents.service"
import { IngestionService } from "./modules/ingestion/ingestion.service"
import { BedrockService } from "./shared/bedrock/bedrock.service"
import { ConfigService } from "./shared/config/config.service"
import { S3Service } from "./shared/s3/s3.service"
import { S3VectorsService } from "./shared/s3-vectors/s3-vectors.service"

export const createDocumentsService = (): DocumentsService => {
  const config = new ConfigService()
  return new DocumentsService(new S3Service(config))
}

export const createIngestionService = (): IngestionService => {
  const config = new ConfigService()
  const s3 = new S3Service(config)
  return new IngestionService(
    s3,
    new BedrockService(config),
    new S3VectorsService(config),
    new DocumentsService(s3),
  )
}
