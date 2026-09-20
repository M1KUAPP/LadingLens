import { useEffect, useState } from 'react'
import { fixtureInboxSource } from './inbox-source'
import type { InboxDataset, InboxSource } from './inbox-types'

export type InboxDatasetState =
  | { status: 'loading' }
  | { status: 'error'; problems: string[] }
  | { status: 'ready'; dataset: InboxDataset }

export function useInboxDataset(
  source: InboxSource = fixtureInboxSource
): InboxDatasetState {
  const [state, setState] = useState<InboxDatasetState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void source.load().then((result) => {
      if (cancelled) return
      setState(
        result.kind === 'ready'
          ? { status: 'ready', dataset: result.dataset }
          : { status: 'error', problems: result.problems }
      )
    })
    return () => {
      cancelled = true
    }
  }, [source])
  return state
}
