export const MESSAGE_AUTHOR = {
  user: "user",
  assistant: "assistant",
} as const

export const CHAT_COMPLETION = {
  streaming: "streaming",
  complete: "complete",
  stopped: "stopped",
  error: "error",
} as const

export const MARKER_SPLIT_PATTERN = /(\[c\d+\])/
export const MARKER_PATTERN = /^\[c\d+\]$/

export const GENERATION_MODEL_LABEL = "Amazon Nova Lite"

export const BREADCRUMB_SEPARATOR = " › "
export const BREADCRUMB_MAX_CHARS = 40
export const CITATION_LABEL_SEPARATOR = " · "

export const FLAG_SEPARATOR = ", "

export const QUESTION_COUNTER_THRESHOLD = 200

export const CONTEXT_SKELETON_LINES = 8

export const TOO_LONG_STATUSES = [400, 413]
