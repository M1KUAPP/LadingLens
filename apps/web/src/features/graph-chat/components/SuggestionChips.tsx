import { Scrollbar } from '../../../components/ui/Domain'

type SuggestionChipsProps = {
  questions: readonly string[]
  disabled?: boolean
  onPick: (question: string) => void
}

// A chip sends its text verbatim — it is a button, not an input prefill. The
// row stays mounted while a request is in flight (disabled, not hidden) so
// the panel does not jump; overflow scrolls sideways on the in-house track.
export function SuggestionChips({ questions, disabled = false, onPick }: SuggestionChipsProps) {
  return (
    <div className="graph-chat-chips-row">
      <Scrollbar orientation="horizontal" label="Suggested questions">
        <div className="graph-chat-chips">
          {questions.map((question) => (
            <button
              key={question}
              type="button"
              className="graph-chat-chip"
              disabled={disabled}
              // Focus alone leaves a chip that is half scrolled out of the
              // row where it is, so bring the whole chip into view.
              onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })}
              onClick={() => onPick(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </Scrollbar>
    </div>
  )
}
