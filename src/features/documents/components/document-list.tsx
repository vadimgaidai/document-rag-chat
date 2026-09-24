import { useQuery } from "@tanstack/react-query"
import { Loader2, Trash2 } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DOCUMENT_STATUS } from "@/contracts"
import type { TDocument } from "@/contracts"
import { useDeleteDocument } from "@/features/documents/api/documents.mutations"
import { documentQueries } from "@/features/documents/api/documents.queries"
import { DeleteDocumentDialog } from "@/features/documents/components/delete-document-dialog"
import { DocumentStatusBadge } from "@/features/documents/components/document-status-badge"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"

const SKELETON_ROWS = [0, 1, 2]
const KILOBYTE = 1024
const MEGABYTE = KILOBYTE * KILOBYTE
const EMPTY_CELL = "—"

const formatSize = (bytes: number, locale: string) => {
  const inMegabytes = bytes >= MEGABYTE
  const value = bytes / (inMegabytes ? MEGABYTE : KILOBYTE)
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  return `${formatted} ${inMegabytes ? "MB" : "KB"}`
}

const formatUploadedAt = (isoDate: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(isoDate),
  )

const DocumentRow = ({
  document,
  locale,
  isDeleting,
  onDelete,
}: {
  document: TDocument
  locale: string
  isDeleting: boolean
  onDelete: (document: TDocument) => void
}) => (
  <TableRow>
    <TableCell className="font-medium">{document.name}</TableCell>
    <TableCell>{formatSize(document.sizeBytes, locale)}</TableCell>
    <TableCell>{formatUploadedAt(document.uploadedAt, locale)}</TableCell>
    <TableCell>
      <DocumentStatusBadge document={document} />
    </TableCell>
    <TableCell className="text-right">
      {document.status === DOCUMENT_STATUS.ready && document.chunkCount !== undefined
        ? document.chunkCount
        : EMPTY_CELL}
    </TableCell>
    <TableCell className="text-right">
      <Button
        aria-label={m.documents_delete_action()}
        disabled={isDeleting}
        onClick={() => onDelete(document)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {isDeleting ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" />
        )}
      </Button>
    </TableCell>
  </TableRow>
)

export const DocumentList = () => {
  const locale = getLocale()
  // S3 continuation tokens only go forward, so the cursors already used are
  // kept to walk back. The last entry is the current page; `undefined` is page one.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const currentCursor = cursors[cursors.length - 1]
  const [pendingDeletion, setPendingDeletion] = useState<TDocument | null>(null)

  const { data, isPending, isError, refetch } = useQuery(documentQueries.list(currentCursor))
  const deleteDocument = useDeleteDocument()

  const confirmDeletion = () => {
    if (!pendingDeletion) {
      return
    }
    deleteDocument.mutate(pendingDeletion.fileId, { onSettled: () => setPendingDeletion(null) })
  }

  const cancelDeletion = () => {
    if (!deleteDocument.isPending) {
      setPendingDeletion(null)
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {SKELETON_ROWS.map((row) => (
          <Skeleton className="h-10 w-full" key={row} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{m.documents_list_error()}</AlertTitle>
        <AlertDescription>
          <Button
            onClick={() => {
              void refetch()
            }}
            size="sm"
            variant="outline"
          >
            {m.documents_retry()}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (data.documents.length === 0 && cursors.length === 1) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {m.knowledge_base_empty()}
      </div>
    )
  }

  const failedFileId = deleteDocument.isError ? deleteDocument.variables : undefined
  const failedDocument = data.documents.find((item) => item.fileId === failedFileId)

  return (
    <div className="flex flex-col gap-3">
      {failedDocument && (
        <Alert variant="destructive">
          <AlertTitle>{m.documents_delete_error({ name: failedDocument.name })}</AlertTitle>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.documents_col_name()}</TableHead>
            <TableHead>{m.documents_col_size()}</TableHead>
            <TableHead>{m.documents_col_uploaded()}</TableHead>
            <TableHead>{m.documents_col_status()}</TableHead>
            <TableHead className="text-right">{m.documents_col_chunks()}</TableHead>
            <TableHead className="text-right">{m.documents_col_actions()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.documents.map((item) => (
            <DocumentRow
              document={item}
              isDeleting={deleteDocument.isPending && deleteDocument.variables === item.fileId}
              key={item.fileId}
              locale={locale}
              onDelete={setPendingDeletion}
            />
          ))}
        </TableBody>
      </Table>

      {(cursors.length > 1 || data.nextCursor) && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-sm text-muted-foreground">
            {m.documents_page({ page: cursors.length })}
          </span>
          <Button
            disabled={cursors.length === 1}
            onClick={() => setCursors((current) => current.slice(0, -1))}
            size="sm"
            type="button"
            variant="outline"
          >
            {m.documents_page_previous()}
          </Button>
          <Button
            disabled={!data.nextCursor}
            onClick={() =>
              setCursors((current) => (data.nextCursor ? [...current, data.nextCursor] : current))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {m.documents_page_next()}
          </Button>
        </div>
      )}

      {pendingDeletion && (
        <DeleteDocumentDialog
          document={pendingDeletion}
          isPending={deleteDocument.isPending}
          onCancel={cancelDeletion}
          onConfirm={confirmDeletion}
        />
      )}
    </div>
  )
}
