export type SidebarMode = 'expanded' | 'collapsed'

const STORAGE_KEY = 'ladinglens-sidebar'

// localStorage throws when site data is blocked; a blocked read falls back to
// the expanded default and a blocked write only lasts for this page.
export function readSidebarMode(): SidebarMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed' ? 'collapsed' : 'expanded'
  } catch {
    return 'expanded'
  }
}

export function storeSidebarMode(mode: SidebarMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Storage is unavailable; the choice still holds until the next load.
  }
}
