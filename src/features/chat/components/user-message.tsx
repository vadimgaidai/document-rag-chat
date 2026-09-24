type TUserMessageProps = {
  text: string
}

export const UserMessage = ({ text }: TUserMessageProps) => (
  <div className="max-w-[80%] self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
    {text}
  </div>
)
