/** Backtick spans and `**bold**` lead-ins; the content uses no other inline syntax. */
const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*)/g

export const InlineText = ({ text }: { text: string }) => (
  <>
    {text.split(INLINE_PATTERN).map((part, index) => {
      if (part.startsWith("`")) {
        return (
          <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]" key={index}>
            {part.slice(1, -1)}
          </code>
        )
      }

      if (part.startsWith("**")) {
        return (
          <strong className="font-semibold" key={index}>
            {part.slice(2, -2)}
          </strong>
        )
      }

      return part
    })}
  </>
)
