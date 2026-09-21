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
        supporting="Load a mail bundle and see where every email ended: processed, held for review, or failed."
        tag="Prepared data"
        hintLabel="Where batch data comes from"
        hint={
          <span>
            Counts and states come from the checked-in mail bundle. Bundles you drop are staged only; this demo does not
            classify them.
          </span>
        }
      />
      <IngestView source={source} />
    </div>
  )
}
