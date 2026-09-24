import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"
import pThrottle from "p-throttle"
import { z } from "zod"

import type { ConfigService } from "@/server/shared/config/config.service"
import { mapWithConcurrency } from "@/server/shared/utils/concurrency"

import {
  DEFAULT_CONCURRENCY,
  EMBED_MAX_ATTEMPTS,
  EMBED_RATE_INTERVAL_MS,
  EMBED_REQUESTS_PER_SECOND,
  EMBEDDING_DIMENSIONS,
} from "./bedrock.constants"

import type { TEmbeddings, TEmbedOptions } from "./bedrock.types"

const titanResponseSchema = z.object({
  embedding: z.array(z.number()).length(EMBEDDING_DIMENSIONS),
  inputTextTokenCount: z.number().int().nonnegative().optional(),
})

export class BedrockService {
  private readonly client: BedrockRuntimeClient

  // The quota is per account and region, so one limiter guards every call made
  // through this instance, whichever batch it belongs to
  private readonly invokeEmbedding = pThrottle({
    limit: EMBED_REQUESTS_PER_SECOND,
    interval: EMBED_RATE_INTERVAL_MS,
    strict: true,
  })((modelId: string, text: string) => this.embedOne(modelId, text))

  constructor(private readonly config: ConfigService) {
    // Throttling, 5xx and model warm-up are retried by the SDK itself
    this.client = new BedrockRuntimeClient({
      region: config.region,
      retryMode: "adaptive",
      maxAttempts: EMBED_MAX_ATTEMPTS,
    })
  }

  // Titan v2 embeds one input per call, so a batch is a pool of calls. Order is
  // preserved: the caller pairs `embeddings[i]` with `texts[i]`.
  async embed(
    texts: readonly string[],
    { concurrency = DEFAULT_CONCURRENCY }: TEmbedOptions = {},
  ): Promise<TEmbeddings> {
    const modelId = this.config.embeddingsModelId

    const responses = await mapWithConcurrency(texts, concurrency, (text) =>
      this.invokeEmbedding(modelId, text),
    )

    return {
      embeddings: responses.map((response) => response.embedding),
      inputTokens: responses.reduce(
        (total, response) => total + (response.inputTextTokenCount ?? 0),
        0,
      ),
    }
  }

  private async embedOne(modelId: string, text: string) {
    const response = await this.client.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: text,
          dimensions: EMBEDDING_DIMENSIONS,
          normalize: true,
        }),
      }),
    )

    return titanResponseSchema.parse(JSON.parse(new TextDecoder().decode(response.body)))
  }
}
