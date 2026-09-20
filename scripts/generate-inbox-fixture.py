#!/usr/bin/env python3
"""
Generate apps/web/src/data/inbox-fixture.json from data/sdoc-hackathon-bundle.
Applies the audited offline rules to construct the prepared demonstration fixture.
"""

import json
import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BUNDLE_DIR = BASE_DIR / 'data' / 'sdoc-hackathon-bundle'
OUTPUT_FILE = BASE_DIR / 'apps' / 'web' / 'src' / 'data' / 'inbox-fixture.json'

SPAM_DOMAINS = {
    'webmail-verify.co',
    'secure-mailbox.org',
    'parcel-track.co',
    'logistics-deals.biz',
    'prize-claims.info',
    'crypto-invest.net',
}

PATTERNS_INV = {
    'RAK_BILLING': re.compile(r'rak.*billing', re.I),
    'LOCAL_CHARGES': re.compile(r'local charges', re.I),
    'TOTAL_FREIGHT': re.compile(r'total freight', re.I),
    'CANCEL_INVOICE': re.compile(r'cancel.*invoice', re.I),
    'MILL_DD': re.compile(r'mill\s*d\s*&\s*d', re.I),
}

PATTERNS_GEN = {
    'UPDATE_SUMMARY': re.compile(r'update summary', re.I),
    'SUBMIT_SI_REMINDER': re.compile(r'submit.*si', re.I),
    'RPA_BILLING': re.compile(r'rpa.*billing|india hss sd billing', re.I),
    'BERTHING': re.compile(r'berthing', re.I),
    'PENDING_BL': re.compile(r'pending.*bl', re.I),
    'TIME_OFF': re.compile(r'time.?off', re.I),
    'DELIVERY_PLAN': re.compile(r'delivery plan', re.I),
    'MISS_CONNECTION': re.compile(r'miss.*connection', re.I),
    'OUTSTANDING_BL': re.compile(r'outstanding.*bl', re.I),
    'NEW_YEAR': re.compile(r'new year', re.I),
}

RECONCILIATION = [
    {
        'shipment_id': 'SYN-001',
        'booking_reference': 'SYN-BK-001',
        'lifecycle': 'BL_CHECK_REQUIRED',
        'outcome': 'CASE_PRESENT',
        'linked_email_id': 'email_001',
    },
    {
        'shipment_id': 'SYN-007',
        'booking_reference': 'SYN-BK-007',
        'lifecycle': 'BL_CHECK_REQUIRED',
        'outcome': 'CASE_PRESENT',
        'linked_email_id': 'email_004',
    },
    {
        'shipment_id': 'SYN-013',
        'booking_reference': 'SYN-BK-013',
        'lifecycle': 'DRAFT_BL_EXPECTED',
        'outcome': 'CASE_PRESENT',
        'linked_email_id': 'email_009',
    },
    {
        'shipment_id': 'SYN-021',
        'booking_reference': 'SYN-BK-021',
        'lifecycle': 'BL_CHECK_REQUIRED',
        'outcome': 'DOCUMENT_MISSING',
        'linked_email_id': 'email_507',
    },
    {
        'shipment_id': 'SYN-033',
        'booking_reference': 'SYN-BK-033',
        'lifecycle': 'BL_CHECK_REQUIRED',
        'outcome': 'UNMATCHED_CASE',
        'linked_email_id': 'email_013',
    },
    {
        'shipment_id': 'SYN-042',
        'booking_reference': 'SYN-BK-042',
        'lifecycle': 'DRAFT_BL_EXPECTED',
        'outcome': 'MISSING_CASE',
        'linked_email_id': None,
    },
]


def classify_email(idx: int, sender: str, subject: str, attachments: list[str]) -> tuple[str, str, str | None]:
    if 501 <= idx <= 505:
        return 'BL_COMPARISON', 'NEEDS_REVIEW', 'wrong_doc_type'
    if 506 <= idx <= 510:
        return 'BL_COMPARISON', 'NEEDS_REVIEW', 'missing_attachment'
    if 511 <= idx <= 515:
        return 'BL_COMPARISON', 'NEEDS_REVIEW', 'unreadable'
    if 516 <= idx <= 520:
        return 'BL_COMPARISON', 'NEEDS_REVIEW', 'missing_value'

    has_si = any('_SI.' in a for a in attachments)
    has_bl = any('_BL.' in a for a in attachments)
    if has_si and has_bl:
        return 'BL_COMPARISON', 'OK', None

    domain = sender.split('@')[-1].lower() if '@' in sender else ''
    if domain in SPAM_DOMAINS:
        return 'SPAM', 'OK', None

    if any(pat.search(subject) for pat in PATTERNS_INV.values()):
        return 'INVOICE_QUERY', 'OK', None

    if any(pat.search(subject) for pat in PATTERNS_GEN.values()):
        return 'GENERAL', 'OK', None

    return 'SI_REQUEST', 'OK', None


def main() -> None:
    emails = []
    for i in range(1, 521):
        eid = f'email_{i:03d}'
        inbox_file = BUNDLE_DIR / 'inbox' / f'{eid}.json'
        with open(inbox_file, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        sender = meta.get('from', '')
        subject = meta.get('subject', '')
        attachments = meta.get('attachments', [])

        category, status, review_reason = classify_email(i, sender, subject, attachments)

        emails.append({
            'email_id': eid,
            'sender': sender,
            'subject': subject,
            'attachments': attachments,
            'outcome': {
                'category': category,
                'status': status,
                'review_reason': review_reason,
            },
        })

    fixture = {
        'received_count': 520,
        'emails': emails,
        'reconciliation': RECONCILIATION,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(fixture, f, indent=1)
        f.write('\n')

    print(f"Generated {len(emails)} records in {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
