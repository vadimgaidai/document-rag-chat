import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

import { DOCS_ACTIVE_SECTION_OFFSET_PX } from "@/features/docs/constants"

const BOTTOM_TOLERANCE_PX = 2

const findActiveSectionId = (sections: HTMLElement[]) => {
  const reachedBottom =
    window.innerHeight + window.scrollY >= document.body.scrollHeight - BOTTOM_TOLERANCE_PX

  if (reachedBottom) {
    return sections[sections.length - 1].id
  }

  let active: HTMLElement | undefined

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= DOCS_ACTIVE_SECTION_OFFSET_PX) {
      active = section
    }
  }

  return active?.id
}

export const useSectionHash = (sectionIds: readonly string[]) => {
  const navigate = useNavigate()

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (sections.length === 0) {
      return
    }

    let frame = 0

    const update = () => {
      frame = 0
      const activeId = findActiveSectionId(sections)

      if (activeId && activeId !== window.location.hash.slice(1)) {
        void navigate({
          hash: activeId,
          replace: true,
          resetScroll: false,
          hashScrollIntoView: false,
        })
      }
    }

    const schedule = () => {
      frame ||= window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [navigate, sectionIds])
}
