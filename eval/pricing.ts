export const PRICES = {
  asOf: "2026-09-24",
  region: "eu-central-1",
  source: "https://aws.amazon.com/bedrock/pricing/",
  novaLite: { inputPer1M: 0.06, outputPer1M: 0.24 },
  titanV2: { inputPer1M: 0.02 },
  rerank35: { perThousandQueries: 2.0 },
} as const

export const ASSUMED_QUERY_TOKENS = 32

export const RETRIEVAL_USD_PER_QUESTION =
  (ASSUMED_QUERY_TOKENS / 1_000_000) * PRICES.titanV2.inputPer1M +
  PRICES.rerank35.perThousandQueries / 1_000
