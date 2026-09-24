import { z } from "zod"

import type { TChunk } from "./chunker.types"

const chunkSchema = z.object({
  chunkId: z.string().min(1),
  fileId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  headingPath: z.array(z.string()),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  text: z.string(),
}) satisfies z.ZodType<TChunk>

export const serializeChunks = (chunks: readonly TChunk[]) =>
  chunks.map((chunk) => `${JSON.stringify(chunk)}\n`).join("")

export const parseChunks = (text: string): TChunk[] =>
  text.split("\n").flatMap((line, index) => {
    if (line.trim() === "") {
      return []
    }

    try {
      return [chunkSchema.parse(JSON.parse(line))]
    } catch (error) {
      throw new Error(`chunks.jsonl: line ${String(index + 1)} is not a chunk`, { cause: error })
    }
  })
