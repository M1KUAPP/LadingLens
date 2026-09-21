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
            Expected shipments come from prepared CSV data. Every outcome below is derived the same way each run, so the
            demonstration is repeatable.
          </span>
        }
      />
      {/* An escalated missing case is worked in the review queue. */}
      <ReconciliationView onEscalateMissingCase={() => navigate('/review')} />
    </div>
  )
}
