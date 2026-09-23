import { createFileRoute } from "@tanstack/react-router"
import { FileText, MessagesSquare } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { m } from "@/paraglide/messages"

const Home = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {m.app_title()}
        </h1>
        <LocaleSwitcher />
      </div>
      <p className="max-w-2xl text-base text-muted-foreground">{m.app_intro()}</p>
    </header>

    <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
            {m.documents_title()}
          </CardTitle>
          <CardDescription>{m.documents_subtitle()}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {m.documents_empty()}
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
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
    </div>
  </main>
)

export const Route = createFileRoute("/")({ component: Home })
