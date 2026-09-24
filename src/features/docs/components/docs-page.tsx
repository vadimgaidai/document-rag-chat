import { Fragment } from "react"

import { Separator } from "@/components/ui/separator"
import { DocsSection } from "@/features/docs/components/docs-section"
import { DocsToc } from "@/features/docs/components/docs-toc"
import { DOCS_INTRO, DOCS_SECTION_IDS, DOCS_SECTIONS } from "@/features/docs/constants"
import { useSectionHash } from "@/features/docs/hooks/use-section-hash"

export const DocsPage = () => {
  useSectionHash(DOCS_SECTION_IDS)

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8" lang="en">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{DOCS_INTRO.title}</h1>
        <p className="text-sm text-muted-foreground">{DOCS_INTRO.lead}</p>
      </header>
      <DocsToc />
      {DOCS_SECTIONS.map((section) => (
        <Fragment key={section.id}>
          <Separator />
          <DocsSection section={section} />
        </Fragment>
      ))}
    </article>
  )
}
