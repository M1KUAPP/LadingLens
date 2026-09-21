import type { EmailDetailRecord } from '../types'
import { email001Fixture } from './email_001'
import { email004Fixture } from './email_004'
import { email507Fixture } from './email_507'
import { email511Fixture } from './email_511'
import { email516Fixture } from './email_516'
import { emailAmbiguousFixture } from './email_ambiguous'
import { emailFormatShowcaseFixture } from './email_format_showcase'

export {
  email001Fixture,
  email004Fixture,
  email507Fixture,
  email511Fixture,
  email516Fixture,
  emailAmbiguousFixture,
  emailFormatShowcaseFixture
}

export const PREPARED_FIXTURES: Record<string, EmailDetailRecord> = {
  email_001: email001Fixture,
  email_004: email004Fixture,
  email_507: email507Fixture,
  email_511: email511Fixture,
  email_516: email516Fixture,
  email_ambiguous: emailAmbiguousFixture,
  email_format_showcase: emailFormatShowcaseFixture
}
