import { useSyncExternalStore } from "react"

import { CHAT_DISCLAIMER_STORAGE_KEY } from "@/features/chat/constants"

const listeners = new Set<() => void>()

let closedInSession = false

const emit = () => {
  for (const listener of listeners) {
    listener()
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  window.addEventListener("storage", listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

const getSnapshot = () => {
  if (closedInSession) {
    return false
  }

  try {
    return window.localStorage.getItem(CHAT_DISCLAIMER_STORAGE_KEY) === null
  } catch {
    return true
  }
}

const getServerSnapshot = () => false

export const useChatDisclaimer = () => {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const dismiss = () => {
    closedInSession = true
    emit()
  }

  const accept = () => {
    try {
      window.localStorage.setItem(CHAT_DISCLAIMER_STORAGE_KEY, new Date().toISOString())
    } catch {
      // Storage can be blocked; the warning shows again on the next visit.
    }

    dismiss()
  }

  return { open, accept, dismiss }
}
