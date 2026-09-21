import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import AiChat02Icon from '@hugeicons/core-free-icons/AiChat02Icon'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import { Button } from '../../components/ui/Controls'
import { useGraphAssistant } from './assistant-context'
import { GraphChatPanel } from './GraphChatPanel'
import './floating-assistant.css'

/**
 * The assistant, folded into a pill at the bottom right of every workspace
 * page and unfolded into the chat panel over the same corner. Both halves
 * stay mounted, so the conversation survives folding and page changes; the
 * folded half is inert.
 */
export function FloatingAssistant() {
  const assistant = useGraphAssistant()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const unfolded = useRef(false)

  // Focus follows the fold: into the composer on the way out, back to the
  // pill on the way in, but never on the first render.
  useEffect(() => {
    if (open) {
      unfolded.current = true
      panelRef.current?.querySelector('textarea')?.focus()
    } else if (unfolded.current) {
      launcherRef.current?.focus()
    }
  }, [open])

  function unfold() {
    assistant.loadCorpus()
    setOpen(true)
  }

  return (
    <aside className="floating-assistant" data-open={open} aria-label="Assistant">
      <div
        ref={panelRef}
        id={panelId}
        className="floating-assistant-panel"
        inert={!open}
        aria-hidden={open ? undefined : true}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <GraphChatPanel
          corpus={assistant.corpus}
          onHighlight={assistant.setHighlight}
          onPending={assistant.setPending}
          onGraph={assistant.setAnswerGraph}
          // A citation points at the canvas; off the graph page, it opens it.
          onCitationOpen={pathname === '/graph' ? undefined : () => navigate('/graph')}
          api={assistant.api}
          headerAction={
            <Button
              variant="ghost"
              className="floating-assistant-fold"
              aria-label="Fold assistant"
              onClick={() => setOpen(false)}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} size={18} aria-hidden="true" />
            </Button>
          }
        />
      </div>
      <button
        ref={launcherRef}
        type="button"
        className="floating-assistant-launcher"
        aria-expanded={open}
        aria-controls={panelId}
        inert={open}
        onClick={unfold}
      >
        <HugeiconsIcon icon={AiChat02Icon} size={18} aria-hidden="true" />
        Assistant
      </button>
    </aside>
  )
}
