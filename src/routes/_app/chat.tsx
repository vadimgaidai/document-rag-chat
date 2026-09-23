import { createFileRoute } from "@tanstack/react-router"
import { MessagesSquare } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { m } from "@/paraglide/messages"

const ChatPage = () => (
  <Card className="flex flex-1 flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <MessagesSquare aria-hidden="true" className="size-5 text-muted-foreground" />
        {m.chat_title()}
      </CardTitle>
      <CardDescription>{m.chat_subtitle()}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col">
      <div className="flex min-h-56 flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {m.chat_empty()}
      </div>
    </CardContent>
  </Card>
)

export const Route = createFileRoute("/_app/chat")({ component: ChatPage })
