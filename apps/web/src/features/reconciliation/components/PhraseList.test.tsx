import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PhraseList } from './PhraseList'

describe('PhraseList', () => {
  it('keeps each item whole and puts the only break points between items', () => {
    const { container } = render(
      <p>
        <PhraseList items={['SHP-AMB-009-A', 'SHP-AMB-009-B']} separator="," />
      </p>
    )
    expect(container.textContent).toBe('SHP-AMB-009-A, SHP-AMB-009-B')
    const items = [...container.querySelectorAll('.phrase-list-item')].map((item) => item.textContent)
    expect(items).toEqual(['SHP-AMB-009-A,', 'SHP-AMB-009-B'])
  })
})
