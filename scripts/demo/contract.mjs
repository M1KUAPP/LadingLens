export function validateWorkflowModule(module) {
  const requiredBeats = module?.requiredBeats

  if (!Array.isArray(requiredBeats) || requiredBeats.length === 0) {
    throw new Error('Workflow requiredBeats must be a non-empty array.')
  }
  if (requiredBeats.some((beat) => typeof beat !== 'string' || beat.trim() === '')) {
    throw new Error('Workflow requiredBeats must contain non-blank strings.')
  }
  if (new Set(requiredBeats).size !== requiredBeats.length) {
    throw new Error('Workflow requiredBeats must be unique.')
  }
  if (typeof module.workflow !== 'function') {
    throw new Error('Workflow module must export a workflow function.')
  }

  return module
}

export function auditCapture(requiredBeats, beats, filmed) {
  const observed = beats.map(({ name }) => name)
  const missing = requiredBeats.filter((name) => filmed[name] !== 1)
  const duplicated = requiredBeats.filter(
    (name) => observed.filter((observedName) => observedName === name).length !== 1
  )
  const ordered = requiredBeats.every((name, index) => observed[index] === name)
  const unexpected = observed.filter((name) => !requiredBeats.includes(name))

  return {
    complete: !missing.length && !duplicated.length && !unexpected.length && ordered,
    missing,
    duplicated,
    unexpected,
    ordered,
    observed
  }
}
