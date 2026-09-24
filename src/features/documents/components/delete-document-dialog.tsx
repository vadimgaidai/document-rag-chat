import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DOCUMENT_STATUS } from "@/contracts"
import type { TDocument } from "@/contracts"
import { m } from "@/paraglide/messages"

export const DeleteDocumentDialog = ({
  document,
  isPending,
  onConfirm,
  onCancel,
}: {
  document: TDocument
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}) => (
  <AlertDialog onOpenChange={onCancel} open>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{m.documents_delete_title({ name: document.name })}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="flex flex-col gap-2">
            <span>{m.documents_delete_description()}</span>
            {document.status === DOCUMENT_STATUS.processing && (
              <span>{m.documents_delete_processing_warning()}</span>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{m.documents_delete_cancel()}</AlertDialogCancel>
        <Button disabled={isPending} onClick={onConfirm} type="button" variant="destructive">
          {isPending ? m.documents_delete_pending() : m.documents_delete_confirm()}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
