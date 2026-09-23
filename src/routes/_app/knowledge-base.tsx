import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { m } from "@/paraglide/messages"

const KnowledgeBasePage = () => (
  <Card className="flex flex-1 flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
        {m.knowledge_base_title()}
      </CardTitle>
      <CardDescription>{m.knowledge_base_subtitle()}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {m.knowledge_base_empty()}
      </div>
    </CardContent>
  </Card>
)

export const Route = createFileRoute("/_app/knowledge-base")({ component: KnowledgeBasePage })
