import { PREPARED_FIXTURES } from './fixtures'
import type {
  CaseReviewActionInput,
  EmailDetailRecord,
  ReviewHistoryEntry
} from './types'

export interface EmailDetailService {
  getEmailDetail(emailId: string): Promise<EmailDetailRecord | null>
  submitReviewAction(input: CaseReviewActionInput): Promise<EmailDetailRecord>
}

function cloneRecord(record: EmailDetailRecord): EmailDetailRecord {
  return structuredClone(record)
}

export function createPreparedEmailDetailService(
  initialData: Record<string, EmailDetailRecord> = PREPARED_FIXTURES
): EmailDetailService {
  const store: Record<string, EmailDetailRecord> = {}
  for (const [key, value] of Object.entries(initialData)) {
    store[key] = cloneRecord(value)
  }

  return {
    async getEmailDetail(emailId: string): Promise<EmailDetailRecord | null> {
      const record = store[emailId]
      if (!record) {
        return null
      }
      return cloneRecord(record)
    },

    async submitReviewAction(
      input: CaseReviewActionInput
    ): Promise<EmailDetailRecord> {
      // Find the record matching the case_id
      let targetKey: string | undefined
      for (const [key, record] of Object.entries(store)) {
        if (record.held_review?.case_id === input.case_id) {
          targetKey = key
          break
        }
      }

      if (!targetKey) {
        throw new Error(`Unknown case_id: ${input.case_id}`)
      }

      const record = store[targetKey]
      if (!record || !record.held_review) {
        throw new Error(`Case ${input.case_id} not found in prepared records`)
      }

      const actionable = new Set(['OPEN', 'IN_REVIEW'])
      if (!actionable.has(record.held_review.disposition)) {
        throw new Error(
          `Case ${input.case_id} is already settled (${record.held_review.disposition})`
        )
      }

      const historyEntry: ReviewHistoryEntry = {
        id: `hist_action_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: input.actor_id,
        action: input.action,
        note: input.rationale
      }

      record.held_review.history = [...record.held_review.history, historyEntry]
      record.held_review.disposition =
        input.action === 'APPROVE'
          ? 'APPROVED'
          : input.action === 'CORRECT'
            ? 'CORRECTED'
            : 'REJECTED'

      if (input.action === 'APPROVE') {
        record.status = 'OK'
      }

      return cloneRecord(record)
    }
  }
}

export const defaultEmailDetailService = createPreparedEmailDetailService()
