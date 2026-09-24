import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { TSourceRef } from "@/contracts"
import { ContextLines } from "@/features/chat/components/context-lines"
import { CONTEXT_SKELETON_LINES } from "@/features/chat/constants"
import { formatBreadcrumb } from "@/features/chat/utils/format"
import { documentQueries } from "@/features/documents/api/documents.queries"
import { m } from "@/paraglide/messages"

type TContextViewerProps = {
  citation: TSourceRef | null
  onClose: () => void
}

type TContextBodyProps = {
  citation: TSourceRef
}

const ContextBody = ({ citation }: TContextBodyProps) => {
  const query = useQuery(
    documentQueries.context(citation.fileId, citation.startLine, citation.endLine),
  )
  const breadcrumb = formatBreadcrumb(citation.headingPath)

  return (
    <>
      <SheetHeader>
        <SheetTitle>{citation.fileName}</SheetTitle>
        <SheetDescription>
          {m.chat_context_lines({ from: citation.startLine, to: citation.endLine })}
        </SheetDescription>
        {breadcrumb && <span className="text-xs text-muted-foreground">{breadcrumb}</span>}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {query.isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: CONTEXT_SKELETON_LINES }, (_, index) => (
              <Skeleton className="h-4 w-full" key={index} />
            ))}
          </div>
        )}

        {query.isError && (
          <Alert variant="destructive">
            <AlertTitle>{m.chat_context_error()}</AlertTitle>
            <AlertDescription>
              <Button
                onClick={() => {
                  void query.refetch()
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {m.chat_context_retry()}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {query.data && <ContextLines context={query.data} />}
      </div>
    </>
  )
}

export const ContextViewer = ({ citation, onClose }: TContextViewerProps) => (
  <Sheet
    onOpenChange={(open) => {
      if (!open) onClose()
    }}
    open={citation !== null}
  >
    <SheetContent className="flex flex-col sm:max-w-xl" side="right">
      {citation && <ContextBody citation={citation} />}
    </SheetContent>
  </Sheet>
)
