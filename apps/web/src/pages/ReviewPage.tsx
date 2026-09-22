import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon'
import { PageHead } from '../components/ui/PageHead'
import { ReviewQueueView } from '../features/review-queue/ReviewQueueView'

export function ReviewPage() {
  return (
    <div className="page">
      <PageHead
        icon={FileValidationIcon}
        title="Review queue"
        supporting="Held cases and reconciliation exceptions awaiting a decision."
        hintLabel="About the review queue"
        hint={
          <span>
            Held cases wait here for a person to decide them. Reconciliation exceptions join them after a run on the
            Reconciliation page, where the expected-shipment CSV behind them lives, and stay until Reset All in
            Settings.
          </span>
        }
      />
      <ReviewQueueView />
    </div>
  )
}
