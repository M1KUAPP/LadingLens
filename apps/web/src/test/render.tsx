import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

export function renderAt(path: string, element: ReactElement) {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>)
}
