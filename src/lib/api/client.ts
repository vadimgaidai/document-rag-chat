import { apiErrorSchema } from "@/contracts"
import type { TApiErrorCode } from "@/contracts"

import type { z } from "zod"

export class ApiError extends Error {
  readonly status: number

  readonly code: TApiErrorCode | "unknown"

  constructor(status: number, code: TApiErrorCode | "unknown", message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

const readError = async (response: Response) => {
  try {
    const parsed = apiErrorSchema.safeParse(await response.json())
    if (parsed.success) {
      return new ApiError(response.status, parsed.data.code, parsed.data.message)
    }
  } catch {
    // A non-JSON body (a proxy error page, an empty 502) is expected here.
  }
  return new ApiError(response.status, "unknown", `Request failed with ${String(response.status)}.`)
}

export const apiFetch = async <TSchema extends z.ZodType>(
  schema: TSchema,
  input: string,
  init?: RequestInit,
): Promise<z.infer<TSchema>> => {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw await readError(response)
  }

  return schema.parse(await response.json())
}
