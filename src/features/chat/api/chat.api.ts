import { fetchServerSentEvents } from "@tanstack/ai-react"

export const chatApi = {
  connection: () => fetchServerSentEvents("/api/chat"),
}
