import { useLayoutEffect } from 'react'

// The workspace tokens and primitive skins key off this attribute on <html>,
// so portaled overlays share them and the public pages never see them. A
// layout effect sets it before the first paint of the shell.
export function useWorkspaceSurface() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'workspace'
    return () => {
      delete root.dataset.surface
    }
  }, [])
}
