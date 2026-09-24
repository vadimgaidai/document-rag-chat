import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DOCUMENT_STATUS, PROCESSING_STALE_AFTER_MS } from "@/contracts"
import type { TDocument } from "@/contracts"
import { m } from "@/paraglide/messages"

const isStale = (uploadedAt: string) =>
  Date.now() - new Date(uploadedAt).getTime() > PROCESSING_STALE_AFTER_MS

export const DocumentStatusBadge = ({ document }: { document: TDocument }) => {
  if (document.status === DOCUMENT_STATUS.ready) {
    return <Badge>{m.documents_status_ready()}</Badge>
  }

  if (document.status === DOCUMENT_STATUS.failed) {
    return (
      <Badge title={document.reason} variant="destructive">
        {m.documents_status_failed()}
      </Badge>
    )
  }

  if (isStale(document.uploadedAt)) {
    return <Badge variant="outline">{m.documents_status_slow()}</Badge>
  }

  return (
    <Badge variant="secondary">
      <Loader2 aria-hidden="true" className="animate-spin" />
      {m.documents_status_processing()}
    </Badge>
  )
}
