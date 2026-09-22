import type { ControlGraph } from '../types'
import graphText from './prepared.json?raw'

/** The seed's control-graph overview, written by apps/api/scripts/build_web_fixtures.py. */
export const preparedControlGraph = JSON.parse(graphText) as ControlGraph
