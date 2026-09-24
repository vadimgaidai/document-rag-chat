import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GENERATION_MODEL_LABEL } from "@/features/chat/constants"
import { useChatDisclaimer } from "@/features/chat/hooks/use-chat-disclaimer"
import { m } from "@/paraglide/messages"

export const ChatDisclaimerDialog = () => {
  const { open, accept, dismiss } = useChatDisclaimer()

  return (
    <AlertDialog onOpenChange={dismiss} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.chat_disclaimer_title()}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span>{m.chat_model_disclaimer({ model: GENERATION_MODEL_LABEL })}</span>
              <span>{m.chat_history_disclaimer()}</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={accept}>{m.chat_disclaimer_accept()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
