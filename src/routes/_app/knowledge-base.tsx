import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentList, UploadDialog } from "@/features/documents"
import { m } from "@/paraglide/messages"

const KnowledgeBasePage = () => (
  <Card className="flex flex-1 flex-col">
    <CardHeader className="flex flex-row items-center justify-between gap-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
        {m.knowledge_base_title()}
      </CardTitle>
      <UploadDialog />
    </CardHeader>
    <CardContent className="flex flex-1 flex-col">
      <DocumentList />
    </CardContent>
  </Card>
)

export const Route = createFileRoute("/_app/knowledge-base")({ component: KnowledgeBasePage })
