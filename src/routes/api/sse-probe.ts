import { createFileRoute } from "@tanstack/react-router"

const PROBE_EVENT_COUNT = 10
const PROBE_EVENT_INTERVAL_MS = 1000

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const createProbeStream = () => {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      for (let n = 1; n <= PROBE_EVENT_COUNT; n += 1) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ n, at: new Date().toISOString() })}\n\n`),
        )
        if (n < PROBE_EVENT_COUNT) await delay(PROBE_EVENT_INTERVAL_MS)
      }
      controller.close()
    },
  })
}

export const Route = createFileRoute("/api/sse-probe")({
  server: {
    handlers: {
      GET: () =>
        new Response(createProbeStream(), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        }),
    },
  },
})
