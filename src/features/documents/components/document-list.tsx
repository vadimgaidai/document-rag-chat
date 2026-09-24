import { useQuery } from "@tanstack/react-query"
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
import { documentQueries } from "@/features/documents/api/documents.queries"
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

export const DocumentList = () => {
  const locale = getLocale()
  // S3 continuation tokens only go forward, so the cursors already used are
  // kept to walk back. The last entry is the current page; `undefined` is page one.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const currentCursor = cursors[cursors.length - 1]

  const { data, isPending, isError, refetch } = useQuery(documentQueries.list(currentCursor))

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

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.documents_col_name()}</TableHead>
            <TableHead>{m.documents_col_size()}</TableHead>
            <TableHead>{m.documents_col_uploaded()}</TableHead>
            <TableHead>{m.documents_col_status()}</TableHead>
            <TableHead className="text-right">{m.documents_col_chunks()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.documents.map((item) => (
            <TableRow key={item.fileId}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{formatSize(item.sizeBytes, locale)}</TableCell>
              <TableCell>{formatUploadedAt(item.uploadedAt, locale)}</TableCell>
              <TableCell>
                <DocumentStatusBadge document={item} />
              </TableCell>
              <TableCell className="text-right">
                {item.status === DOCUMENT_STATUS.ready && item.chunkCount !== undefined
                  ? item.chunkCount
                  : EMPTY_CELL}
              </TableCell>
            </TableRow>
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
    </div>
  )
}
