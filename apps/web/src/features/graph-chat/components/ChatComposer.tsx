import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button } from '../../../components/ui/Controls'

// Mirrors the backend's question limit so an overlong draft fails locally
// instead of travelling to the API for a 422.
const MAX_QUESTION_CHARS = 500

type ChatComposerProps = {
  pending?: boolean
  onSend: (question: string) => void
}

export function ChatComposer({ pending = false, onSend }: ChatComposerProps) {
  const [value, setValue] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow to the CSS max-height (four lines): reset, then measure. The
  // box is border-box and scrollHeight leaves the border out, so it is added
  // back, or the first keystroke would shrink the field by its border.
  function grow() {
    const area = areaRef.current
    if (!area) return
    area.style.height = 'auto'
    area.style.height = `${area.scrollHeight + area.offsetHeight - area.clientHeight}px`
  }

  function submit() {
    const question = value.trim()
    if (!question || pending) return
    onSend(question)
    setValue('')
    const area = areaRef.current
    if (area) area.style.height = 'auto'
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter stays a newline. Tab is left alone so focus
    // can leave the composer.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="graph-chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={areaRef}
        className="graph-chat-input"
        rows={1}
        maxLength={MAX_QUESTION_CHARS}
        value={value}
        placeholder="Ask about this graph…"
        aria-label="Ask about this graph"
        onChange={(event) => {
          setValue(event.target.value)
          grow()
        }}
        onKeyDown={onKeyDown}
      />
      <Button variant="primary" type="submit" disabled={pending || value.trim() === ''}>
        Send
      </Button>
    </form>
  )
}
