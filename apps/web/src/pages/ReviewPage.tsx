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
            Held cases and reconciliation exceptions wait here for a named human owner. The expected-shipment CSV behind
            the exceptions is on the Reconciliation page.
          </span>
        }
      />
      <ReviewQueueView />
    </div>
  )
}
