import { REVIEW_REASON_LABEL } from '../../data/inbox-labels'
import type { ComparedField } from '../../domain/contracts'
import type { JudgeOutcome } from './types'

const FIELD_LABELS: Record<ComparedField, string> = {
  shipper: 'Shipper',
  consignee: 'Consignee',
  notify_party: 'Notify party',
  port_of_loading: 'Port of loading',
  port_of_discharge: 'Port of discharge',
  container_count: 'Container count',
  gross_weight_kg: 'Gross weight (kg)'
}

export function outcomeHeadline(outcome: JudgeOutcome): string {
  if (outcome.status === 'OK') return 'All seven fields match'
  if (outcome.status === 'MISMATCH') {
    const names = outcome.defect_fields.map((fieldName) => FIELD_LABELS[fieldName]).join(', ')
    const count = outcome.defect_fields.length
    const verb = count === 1 ? 'differs' : 'differ'
    return `${count} field${count === 1 ? '' : 's'} ${verb}: ${names}`
  }
  const reason = outcome.review_reason ? REVIEW_REASON_LABEL[outcome.review_reason] : 'Manual review needed'
  return `Needs review: ${reason}`
}
