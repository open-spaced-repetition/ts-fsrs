import type { useI18n } from '@rspress/core/runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createShareUrl } from './share-link'

type Translate = ReturnType<typeof useI18n<typeof import('i18n')>>

export type ShareController = {
  copied: boolean
  status: string
  clear(): void
  share(source: string): Promise<void>
}

/** Publishes the current source as a permalink and reports how that went. */
export function useShare(t: Translate): ShareController {
  const copyResetRef = useRef<number>(undefined)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => () => window.clearTimeout(copyResetRef.current), [])

  const clear = useCallback(() => {
    setStatus('')
    setCopied(false)
  }, [])

  const share = useCallback(
    async (source: string) => {
      const shareUrl = createShareUrl(window.location.href, source)
      // The address bar carries the link even when the clipboard is unavailable.
      window.history.replaceState(null, '', shareUrl)
      if (!navigator.clipboard) {
        setStatus(t('playground.shareUnsupported'))
        return
      }
      try {
        await navigator.clipboard.writeText(shareUrl)
        setStatus(t('playground.shareCopied'))
        // The button label confirms the copy where the pointer already is; the
        // status text alone was too easy to miss.
        setCopied(true)
        window.clearTimeout(copyResetRef.current)
        copyResetRef.current = window.setTimeout(() => setCopied(false), 2400)
      } catch (error) {
        setStatus(
          t('playground.shareFailed', {
            message: error instanceof Error ? error.message : String(error),
          })
        )
      }
    },
    [t]
  )

  return { copied, status, clear, share }
}
