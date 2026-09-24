import { API_ERROR_CODE } from "@/contracts"
import type { TApiError, TApiErrorCode } from "@/contracts"

export const NO_STORE = { "Cache-Control": "no-store" } as const

export const STATUS_BY_CODE: Record<TApiErrorCode, number> = {
  [API_ERROR_CODE.invalidType]: 400,
  [API_ERROR_CODE.tooLarge]: 413,
  [API_ERROR_CODE.limitReached]: 409,
  [API_ERROR_CODE.invalidRequest]: 400,
  [API_ERROR_CODE.notFound]: 404,
  [API_ERROR_CODE.internal]: 500,
}

export const errorResponse = (code: TApiErrorCode, message: string): Response => {
  const body: TApiError = { code, message }
  return Response.json(body, { status: STATUS_BY_CODE[code], headers: NO_STORE })
}
