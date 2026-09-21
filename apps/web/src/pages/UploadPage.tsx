import CloudUploadIcon from '@hugeicons/core-free-icons/CloudUploadIcon'
import { PageHead } from '../components/ui/PageHead'
import { defaultJudgeApi, type JudgeApiClient } from '../features/judge/judge-api'
import { JudgeView } from '../features/judge/JudgeView'

export function UploadPage({ api = defaultJudgeApi }: { api?: JudgeApiClient }) {
  return (
    <div className="page">
      <PageHead
        icon={CloudUploadIcon}
        title="Upload"
        supporting="Check a synthetic shipping instruction against its draft bill of lading with the live pipeline."
        tag="Live pipeline"
        hintLabel="How the live check works"
        hint={
          <span>
            The pair runs through the same pipeline as the inbox: both documents are read, the seven compared fields are
            extracted, and each field is compared. Upload synthetic documents only.
          </span>
        }
      />
      <JudgeView api={api} />
    </div>
  )
}
