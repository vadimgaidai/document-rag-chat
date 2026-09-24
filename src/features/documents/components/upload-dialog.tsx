import { Loader2, Upload } from "lucide-react"
import { createElement, useState } from "react"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_LIBRARY_FILES,
  UPLOAD_CONTENT_TYPE,
} from "@/contracts"
import { UPLOAD_ITEM_STATE } from "@/features/documents/constants"
import { useUploadQueue } from "@/features/documents/hooks/use-upload-queue"
import type { TUploadItem } from "@/features/documents/types"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"

const DROP_AREA_CLASS =
  "flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center"

const UploadRow = ({
  item,
  onRetry,
  onDismiss,
}: {
  item: TUploadItem
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
}) => (
  <li className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm">
    <div className="flex items-center gap-2">
      {item.state === UPLOAD_ITEM_STATE.uploading && (
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      )}
      <span className="truncate font-medium">{item.name}</span>

      {item.state === UPLOAD_ITEM_STATE.uploading && (
        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
          {item.progress}%
        </span>
      )}

      {item.state === UPLOAD_ITEM_STATE.failed && (
        <span className="ml-auto flex shrink-0 gap-1">
          {item.canRetry && (
            <Button onClick={() => onRetry(item.id)} size="sm" type="button" variant="outline">
              {m.documents_upload_retry()}
            </Button>
          )}
          <Button onClick={() => onDismiss(item.id)} size="sm" type="button" variant="ghost">
            {m.documents_upload_dismiss()}
          </Button>
        </span>
      )}
    </div>

    {item.state === UPLOAD_ITEM_STATE.uploading && <Progress value={item.progress} />}
    {item.error && <p className="text-destructive">{item.error}</p>}
  </li>
)

export const UploadDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { items, pendingCount, add, retry, dismiss, clear } = useUploadQueue()
  const isUploading = pendingCount > 0

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { [UPLOAD_CONTENT_TYPE]: [".md"] },
    maxSize: MAX_FILE_BYTES,
    maxFiles: MAX_FILES_PER_UPLOAD,
    disabled: isUploading,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted, rejected) => {
      add(accepted, rejected)
    },
  })

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next && isUploading) {
          return
        }
        if (!next) {
          clear()
        }
        setIsOpen(next)
      }}
      open={isOpen}
    >
      <DialogTrigger asChild>
        <Button type="button">{m.documents_upload_open()}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.documents_upload_title()}</DialogTitle>
          <DialogDescription>
            {m.knowledge_base_limits({
              maxMb: MAX_FILE_BYTES / (1024 * 1024),
              maxFiles: MAX_FILES_PER_UPLOAD,
              maxLibrary: MAX_LIBRARY_FILES,
            })}
          </DialogDescription>
        </DialogHeader>

        {createElement(
          "div",
          getRootProps({
            className: cn(DROP_AREA_CLASS, isDragActive && "border-primary bg-accent"),
          }),
          createElement("input", getInputProps()),
          <Upload aria-hidden="true" className="size-5 text-muted-foreground" />,
          <p className="text-sm text-muted-foreground">{m.documents_drop_hint()}</p>,
          <Button disabled={isUploading} onClick={open} type="button" variant="outline">
            {m.documents_choose_files()}
          </Button>,
        )}

        {items.length > 0 && (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {items.map((item) => (
              <UploadRow item={item} key={item.id} onDismiss={dismiss} onRetry={retry} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
