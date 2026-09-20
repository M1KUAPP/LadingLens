import artifactRaw from './sample-submission.json?raw'
import artifactUrl from './sample-submission.json?url'
import fixtureRaw from './inbox-fixture.json?raw'
import {
  validateEvaluatorArtifact,
  validateInboxFixture
} from './inbox-integrity'
import type { InboxLoadResult, InboxSource } from './inbox-types'

function loadPreparedFixture(): InboxLoadResult {
  try {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    if (!fixture.ok) return { kind: 'error', problems: fixture.problems }
    const artifact = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    if (!artifact.ok) return { kind: 'error', problems: artifact.problems }
    return {
      kind: 'ready',
      dataset: {
        source: 'prepared-fixture',
        rows: fixture.rows,
        artifact: artifact.artifact,
        artifactUrl,
        reconciliation: fixture.reconciliation
      }
    }
  } catch {
    return {
      kind: 'error',
      problems: ['The prepared inbox data could not be read.']
    }
  }
}

// Fixture mode is explicit: this source reads only the checked-in prepared
// dataset until the #30 product API provides the live inbox endpoints.
export const fixtureInboxSource: InboxSource = {
  load: () => Promise.resolve().then(loadPreparedFixture)
}
