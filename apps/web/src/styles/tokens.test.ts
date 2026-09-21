import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

const darkBlocks = tokensCss.slice(tokensCss.indexOf(":root[data-theme='dark']"))

describe('film, silk and radius tokens', () => {
  it.each([
    ['--film-ink', '#1d3045'],
    ['--film-paper', '#ffffff'],
    ['--film-sky', '#cfd4dd'],
    ['--film-halo-ink', 'rgba(255, 255, 255, 0.5)'],
    ['--film-halo-paper', 'rgba(29, 48, 69, 0.55)'],
    ['--silk-tint', '#4a6680'],
    ['--radius-xl', '16px'],
    ['--ease-film', 'cubic-bezier(0.16, 1, 0.3, 1)']
  ])('declares %s once, for both themes', (name, value) => {
    expect(tokensCss).toContain(`${name}: ${value};`)
    expect(tokensCss.split(`${name}:`)).toHaveLength(2)
    expect(darkBlocks).not.toContain(`${name}:`)
  })
})
