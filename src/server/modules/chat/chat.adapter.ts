import { BedrockConverseTextAdapter } from "@tanstack/ai-bedrock"

import { CATALOG_MODEL_ID } from "./chat.constants"

import type { ConverseCommandInput } from "@aws-sdk/client-bedrock-runtime"
import type { TextOptions } from "@tanstack/ai"
import type { BedrockConverseConfig, BedrockConverseProviderOptions } from "@tanstack/ai-bedrock"

export class BedrockInferenceProfileAdapter extends BedrockConverseTextAdapter<
  typeof CATALOG_MODEL_ID
> {
  private readonly inferenceProfileId: string

  constructor(inferenceProfileId: string, config: BedrockConverseConfig) {
    super(config, CATALOG_MODEL_ID)
    this.inferenceProfileId = inferenceProfileId
  }

  protected override buildInput(
    options: TextOptions<BedrockConverseProviderOptions>,
  ): ConverseCommandInput {
    return { ...super.buildInput(options), modelId: this.inferenceProfileId }
  }
}
