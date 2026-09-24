import { useEffect, useRef } from "react"

import type { TContextResponse } from "@/contracts"
import { cn } from "@/lib/utils"

type TContextLinesProps = {
  context: TContextResponse
}

export const ContextLines = ({ context }: TContextLinesProps) => {
  const focusRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center" })
  }, [context])

  return (
    <ol
      className="list-decimal pl-12 font-mono text-xs/5 whitespace-pre-wrap marker:text-muted-foreground"
      start={context.firstLine}
    >
      {context.lines.map((line, index) => {
        const lineNumber = context.firstLine + index
        const inFocus = lineNumber >= context.focus.from && lineNumber <= context.focus.to

        return (
          <li
            className={cn("pl-2", inFocus && "bg-accent")}
            key={lineNumber}
            ref={lineNumber === context.focus.from ? focusRef : undefined}
          >
            {line || " "}
          </li>
        )
      })}
    </ol>
  )
}
