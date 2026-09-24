const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

export class ConfigService {
  get region(): string | undefined {
    return process.env.AWS_REGION
  }

  get documentsBucket(): string {
    return requireEnv("DOCUMENTS_BUCKET")
  }

  get vectorsBucket(): string {
    return requireEnv("VECTORS_BUCKET")
  }

  get vectorsIndex(): string {
    return requireEnv("VECTORS_INDEX")
  }

  get embeddingsModelId(): string {
    return requireEnv("EMBEDDINGS_MODEL_ID")
  }

  get generationModelId(): string {
    return requireEnv("GENERATION_MODEL_ID")
  }

  get rerankModelArn(): string {
    return `arn:aws:bedrock:${requireEnv("AWS_REGION")}::foundation-model/${requireEnv("RERANK_MODEL_ID")}`
  }
}
