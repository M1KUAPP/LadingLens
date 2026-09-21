import { validateEvaluatorArtifact, validateInboxFixture } from './inbox-integrity'
import type { InboxLoadResult, InboxSource } from './inbox-types'

async function loadPreparedFixture(): Promise<InboxLoadResult> {
  try {
    const [fixtureRaw, artifactRaw] = await Promise.all([
      import('./inbox-fixture.json?raw').then((module) => module.default),
      import('./sample-submission.json?raw').then((module) => module.default)
    ])
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    if (!fixture.ok) return { kind: 'error', problems: fixture.problems }
    const artifact = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    if (!artifact.ok) return { kind: 'error', problems: artifact.problems }
    return {
      kind: 'ready',
      dataset: {
        source: 'prepared-fixture',
        receivedCount: fixture.receivedCount,
        rows: fixture.rows,
        artifact: artifact.artifact,
        reconciliation: fixture.reconciliation,
        unmatchedCaseCount: fixture.unmatchedCaseCount
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
  load: () => loadPreparedFixture()
}
