import InboxUploadIcon from '@hugeicons/core-free-icons/InboxUploadIcon'
import { PageHead } from '../components/ui/PageHead'
import { defaultIngestSource, type IngestSource } from '../features/ingest/seam'
import { IngestView } from '../features/ingest/IngestView'

export function IngestPage({ source = defaultIngestSource }: { source?: IngestSource }) {
  return (
    <div className="page">
      <PageHead
        icon={InboxUploadIcon}
        title="Batch ingest"
        supporting="See where every email in the mail bundle ended: processed, held for review, or failed."
        tag="Prepared data"
        hintLabel="Where batch data comes from"
        hint={<span>Counts and states come from the checked-in mail bundle.</span>}
      />
      <IngestView source={source} />
    </div>
  )
}
