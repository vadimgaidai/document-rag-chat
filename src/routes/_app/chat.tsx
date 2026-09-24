import { createFileRoute } from "@tanstack/react-router"
import { MessagesSquare } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatPanel, GENERATION_MODEL_LABEL } from "@/features/chat"
import { m } from "@/paraglide/messages"

const ChatPage = () => (
  <Card className="flex flex-1 flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <MessagesSquare aria-hidden="true" className="size-5 text-muted-foreground" />
        {m.chat_title()}
      </CardTitle>
      <CardDescription>{m.chat_subtitle()}</CardDescription>
      <p className="text-xs text-muted-foreground">
        {m.chat_model_disclaimer({ model: GENERATION_MODEL_LABEL })}
      </p>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col">
      <ChatPanel />
    </CardContent>
  </Card>
)

export const Route = createFileRoute("/_app/chat")({ component: ChatPage })
