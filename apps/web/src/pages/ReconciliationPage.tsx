import { useNavigate } from 'react-router-dom'
import GitCompareIcon from '@hugeicons/core-free-icons/GitCompareIcon'
import { PageHead } from '../components/ui/PageHead'
import { ReconciliationView } from '../features/reconciliation/ReconciliationView'

export function ReconciliationPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <PageHead
        icon={GitCompareIcon}
        title="Reconciliation"
        supporting="Expected shipments matched against the email cases that arrived."
        tag="Prepared data"
        hintLabel="About the reconciliation data"
        hint={
          <span>
            The expected shipments come from a prepared CSV built from the bundle&apos;s own documents, and the BL cases
            from the seeded inbox. Every run derives the same outcomes from them, so the demonstration is repeatable.
          </span>
        }
      />
      {/* An escalated missing case is worked in the review queue. */}
      <ReconciliationView onEscalateMissingCase={() => navigate('/review')} />
    </div>
  )
}
