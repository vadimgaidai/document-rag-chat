import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ModelNotReadyException,
  ServiceUnavailableException,
  ThrottlingException,
} from "@aws-sdk/client-bedrock-runtime"
import { z } from "zod"

import type { ConfigService } from "@/server/shared/config/config.service"
import { mapWithConcurrency } from "@/server/shared/utils/concurrency"

import {
  DEFAULT_CONCURRENCY,
  EMBEDDING_DIMENSIONS,
  RETRY_DELAYS_MS,
  RETRY_JITTER_MS,
} from "./bedrock.constants"

import type { TEmbeddings, TEmbedOptions } from "./bedrock.types"

const titanResponseSchema = z.object({
  embedding: z.array(z.number()).length(EMBEDDING_DIMENSIONS),
  inputTextTokenCount: z.number().int().nonnegative().optional(),
})

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

// Bedrock's own back-pressure and warm-up signals. Everything else — a malformed
// request, an input Titan rejects as too long — is a bug or a bad document, and
// retrying it just burns the three receives.
const isTransient = (error: unknown) =>
  error instanceof ThrottlingException ||
  error instanceof ServiceUnavailableException ||
  error instanceof ModelNotReadyException

export class BedrockService {
  private readonly client: BedrockRuntimeClient

  constructor(private readonly config: ConfigService) {
    this.client = new BedrockRuntimeClient({ region: config.region })
  }

  // Titan v2 embeds one input per call, so a batch is a pool of calls. Order is
  // preserved: the caller pairs `embeddings[i]` with `texts[i]`.
  async embed(
    texts: readonly string[],
    { concurrency = DEFAULT_CONCURRENCY }: TEmbedOptions = {},
  ): Promise<TEmbeddings> {
    const modelId = this.config.embeddingsModelId

    const responses = await mapWithConcurrency(texts, concurrency, (text) =>
      this.embedOne(modelId, text),
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
    for (let attempt = 0; ; attempt += 1) {
      try {
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
      } catch (error) {
        if (!isTransient(error) || attempt >= RETRY_DELAYS_MS.length) {
          throw error
        }
        await delay(RETRY_DELAYS_MS[attempt] + Math.random() * RETRY_JITTER_MS)
      }
    }
  }
}
