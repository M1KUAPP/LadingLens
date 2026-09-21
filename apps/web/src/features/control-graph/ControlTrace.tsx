import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Controls'
import { StatusGlyph } from '../../components/ui/Domain'
import { ClipTooltip, Tooltip } from '../../components/ui/Overlays'
import type { StatusKind } from '../../components/ui/types'
import {
  caseNodeIds,
  isFlag,
  mergeGraphs,
  scopeTrace,
  shipmentNodeIds,
  traceGraph,
  worstState,
  type TraceCase,
  type TraceField,
  type TraceShipment
} from './trace'
import type { ControlGraph, GraphHighlight, GraphNode } from './types'
import './control-trace.css'

type Filter = 'all' | 'mismatch' | 'held' | 'match'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mismatch', label: 'Mismatch' },
  { value: 'held', label: 'Held' },
  { value: 'match', label: 'Match' }
]

const LEGEND: { state: StatusKind; label: string }[] = [
  { state: 'match', label: 'Match' },
  { state: 'mismatch', label: 'Mismatch' },
  { state: 'held', label: 'Held' },
  { state: 'neutral', label: 'Not compared' }
]

type ControlTraceProps = {
  /** The corpus overview. */
  graph: ControlGraph
  /** The assistant's latest answer subgraph; the trace narrows to it. */
  answer?: ControlGraph | null
  highlight?: GraphHighlight | null
  pending?: boolean
}

type Lit = ReadonlySet<string> | null

function documentName(document: GraphNode): string {
  if (/draft|bill of lading/i.test(document.label)) return 'Draft BL'
  if (/shipping instruction/i.test(document.label)) return 'SI'
  return document.label
}

// A document that arrived is a link that held; only a problem breaks it.
function documentState(document: GraphNode): StatusKind {
  return document.state === 'neutral' ? 'match' : document.state
}

function Stage({ label, state, children }: { label: string; state: StatusKind; children: ReactNode }) {
  return (
    <td data-label={label}>
      <span className="trace-stage">
        <span className="trace-marker" data-state={state}>
          <StatusGlyph status={state} />
        </span>
        <span className="trace-stage-body" data-stage={label}>
          {children}
        </span>
      </span>
    </td>
  )
}

type EntityProps = {
  node: GraphNode
  lit: Lit
  traced: GraphNode | null
  onTrace: (node: GraphNode) => void
  label?: string
}

// A value or a shipment is shared between cases, so pressing it traces it:
// every case that names it comes forward.
function Entity({ node, lit, traced, onTrace, label = node.label }: EntityProps) {
  return (
    <ClipTooltip content={node.label}>
      <button
        type="button"
        className="trace-entity"
        data-node-id={node.id}
        data-lit={lit?.has(node.id) || undefined}
        aria-pressed={traced?.id === node.id}
        onClick={() => onTrace(node)}
      >
        <span className="trace-chip-text" data-clip>
          {label}
        </span>
      </button>
    </ClipTooltip>
  )
}

// A chip's text in one line, cut with an ellipsis and whole in its tooltip.
function ChipText({ text }: { text: string }) {
  return (
    <span className="trace-chip-text" data-clip>
      {text}
    </span>
  )
}

function Flags({ flags, lit }: { flags: GraphNode[]; lit: Lit }) {
  if (flags.length === 0) return <span className="trace-muted">None</span>
  return (
    <ul className="trace-list">
      {flags.map((flag) => (
        <li key={flag.id}>
          <ClipTooltip content={flag.label}>
            <span
              className="trace-flag"
              data-state={flag.state}
              data-node-id={flag.id}
              data-lit={lit?.has(flag.id) || undefined}
            >
              <StatusGlyph status={flag.state} />
              <ChipText text={flag.label} />
            </span>
          </ClipTooltip>
        </li>
      ))}
    </ul>
  )
}

function FieldLine({ field, ...entity }: { field: TraceField } & Omit<EntityProps, 'node' | 'label'>) {
  const same = !field.si || !field.bl || field.si.id === field.bl.id
  return (
    <li className="trace-field" data-state={field.state}>
      <StatusGlyph status={field.state} />
      <span className="trace-field-label">{field.label}</span>
      <span className="trace-field-values">
        {same ? (
          <Entity node={(field.si ?? field.bl) as GraphNode} {...entity} />
        ) : (
          <>
            <span className="trace-sided">
              <span className="trace-side">SI</span>
              <Entity node={field.si as GraphNode} {...entity} />
            </span>
            <span className="trace-sided">
              <span className="trace-side">BL</span>
              <Entity node={field.bl as GraphNode} {...entity} />
            </span>
          </>
        )}
      </span>
    </li>
  )
}

function CaseRow({ entry, ...entity }: { entry: TraceCase } & Omit<EntityProps, 'node' | 'label'>) {
  const { email, documents, fields, flags, shipments } = entry
  const held = documents.filter((document) => document.state === 'held' && document.detail)
  return (
    <tr
      data-state={entry.state}
      data-lit={entity.lit ? caseNodeIds(entry).some((id) => entity.lit?.has(id)) : undefined}
    >
      <Stage label="Case" state={email ? email.state : 'neutral'}>
        {email ? (
          <>
            <ClipTooltip content={email.identifier ?? email.id}>
              <Link
                className="trace-case-id"
                to={`/emails/${encodeURIComponent(email.identifier ?? email.id)}`}
                data-node-id={email.id}
                data-lit={entity.lit?.has(email.id) || undefined}
                data-clip
              >
                {email.identifier ?? email.id}
              </Link>
            </ClipTooltip>
            <Tooltip label={`Subject of ${email.identifier ?? email.id}`} text="Details">
              {email.label}
            </Tooltip>
          </>
        ) : (
          <span className="trace-muted">Email not in view</span>
        )}
      </Stage>
      <Stage label="Documents" state={documents.length ? worstState(documents.map(documentState)) : 'neutral'}>
        {documents.length ? (
          <>
            <ul className="trace-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <span
                    className="trace-document"
                    data-state={document.state === 'held' ? 'held' : undefined}
                    data-node-id={document.id}
                    data-lit={entity.lit?.has(document.id) || undefined}
                  >
                    {document.state === 'held' ? <StatusGlyph status="held" /> : null}
                    {documentName(document)}
                  </span>
                </li>
              ))}
            </ul>
            {held.length > 0 ? (
              <Tooltip label={`Document details for ${email?.identifier ?? entry.key}`} text="Details">
                {held.map((document) => (
                  <span key={document.id} className="trace-tip-line">
                    {`${documentName(document)}: ${document.detail}`}
                  </span>
                ))}
              </Tooltip>
            ) : null}
          </>
        ) : (
          <span className="trace-muted">None</span>
        )}
      </Stage>
      <Stage label="Checked fields" state={fields.length ? worstState(fields.map((field) => field.state)) : 'neutral'}>
        {fields.length ? (
          <ul className="trace-fields">
            {fields.map((field) => (
              <FieldLine key={field.label} field={field} {...entity} />
            ))}
          </ul>
        ) : (
          <span className="trace-muted">None compared</span>
        )}
      </Stage>
      <Stage
        label="Flags"
        state={worstState(
          flags.map((flag) => flag.state),
          'match'
        )}
      >
        <Flags flags={flags} lit={entity.lit} />
      </Stage>
      <Stage label="Shipment" state={shipments.length ? worstState(shipments.map((link) => link.state)) : 'neutral'}>
        {shipments.length ? (
          <ul className="trace-list trace-list--stacked">
            {shipments.map((link) => (
              <li key={link.shipment.id} className="trace-shipment">
                <Entity node={link.shipment} label={link.shipment.identifier ?? link.shipment.label} {...entity} />
                <ClipTooltip content={link.outcome}>
                  <span className="trace-outcome" data-state={link.state}>
                    <StatusGlyph status={link.state} />
                    <ChipText text={link.outcome} />
                  </span>
                </ClipTooltip>
              </li>
            ))}
          </ul>
        ) : (
          <span className="trace-muted">No shipment</span>
        )}
      </Stage>
    </tr>
  )
}

function ShipmentRow({ entry, ...entity }: { entry: TraceShipment } & Omit<EntityProps, 'node' | 'label'>) {
  const { shipment, flags } = entry
  return (
    <tr
      data-state={shipment.state}
      data-lit={entity.lit ? shipmentNodeIds(entry).some((id) => entity.lit?.has(id)) : undefined}
    >
      <Stage label="Case" state="neutral">
        <span className="trace-muted">No email case</span>
      </Stage>
      <Stage label="Documents" state="neutral">
        <span className="trace-muted">None</span>
      </Stage>
      <Stage label="Checked fields" state="neutral">
        <span className="trace-muted">None compared</span>
      </Stage>
      <Stage
        label="Flags"
        state={worstState(
          flags.map((flag) => flag.state),
          'match'
        )}
      >
        <Flags flags={flags} lit={entity.lit} />
      </Stage>
      <Stage label="Shipment" state={shipment.state}>
        <span className="trace-shipment">
          <Entity node={shipment} label={shipment.identifier ?? shipment.label} {...entity} />
          {shipment.detail ? (
            <Tooltip label={`Details of ${shipment.identifier ?? shipment.label}`} text="Details">
              {shipment.detail}
            </Tooltip>
          ) : null}
        </span>
      </Stage>
    </tr>
  )
}

export function ControlTrace({ graph, answer = null, highlight = null, pending = false }: ControlTraceProps) {
  const trace = useMemo(() => {
    const whole = traceGraph(answer ? mergeGraphs(graph, answer) : graph)
    return answer ? scopeTrace(whole, answer.nodes) : whole
  }, [graph, answer])
  const [filter, setFilter] = useState<Filter>('all')
  const [traced, setTraced] = useState<GraphNode | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  // What comes forward: the entity the reader is tracing, else what the
  // assistant highlighted.
  const lit = useMemo<Lit>(() => {
    if (traced) return new Set([traced.id])
    if (highlight && highlight.nodeIds.length > 0) return new Set(highlight.nodeIds)
    return null
  }, [traced, highlight])

  // A pressed citation focuses its node: the row that holds it scrolls in.
  const focusId = highlight?.focusNodeId
  useEffect(() => {
    if (!focusId) return
    const target = [...(boardRef.current?.querySelectorAll<HTMLElement>('[data-node-id]') ?? [])].find(
      (element) => element.dataset.nodeId === focusId
    )
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' })
  }, [focusId])

  const counts: Record<Filter, number> = {
    all: trace.cases.length + trace.shipments.length,
    mismatch: 0,
    held: 0,
    match: 0
  }
  for (const state of [
    ...trace.cases.map((entry) => entry.state),
    ...trace.shipments.map((entry) => entry.shipment.state)
  ]) {
    if (state !== 'neutral') counts[state] += 1
  }
  const shown = (state: StatusKind) => filter === 'all' || state === filter
  const cases = trace.cases.filter((entry) => shown(entry.state))
  const shipments = trace.shipments.filter((entry) => shown(entry.shipment.state))
  const tracedCases = traced ? trace.cases.filter((entry) => caseNodeIds(entry).includes(traced.id)).length : 0

  const entity = {
    lit,
    traced,
    onTrace: (node: GraphNode) => setTraced((current) => (current?.id === node.id ? null : node))
  }

  return (
    <div className="control-trace" ref={boardRef}>
      <div className="trace-toolbar">
        <div className="trace-filters" role="group" aria-label="Show cases">
          {FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              variant={filter === value ? 'secondary' : 'ghost'}
              className="trace-filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <span className="trace-filter-count">{counts[value]}</span>
            </Button>
          ))}
        </div>
        <ul className="trace-legend" aria-label="Verdicts">
          {LEGEND.map(({ state, label }) => (
            <li key={state}>
              <span className="trace-marker" data-state={state} aria-hidden="true">
                <StatusGlyph status={state} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      {traced ? (
        <div className="trace-tracing" role="status">
          <span>
            Tracing <strong>{traced.label}</strong>
            {traced.kind === 'shipment' ? '.' : `, named in ${tracedCases} ${tracedCases === 1 ? 'case' : 'cases'}.`}
          </span>
          <Button variant="ghost" onClick={() => setTraced(null)}>
            Stop tracing
          </Button>
        </div>
      ) : null}

      <div className="trace-card" data-pending={pending || undefined} aria-busy={pending}>
        <span className="trace-scan" aria-hidden="true" />
        {cases.length + shipments.length + trace.loose.length === 0 ? (
          <p className="trace-empty">
            {counts.all === 0 ? 'Nothing to trace in this graph yet.' : 'No cases with this verdict.'}
          </p>
        ) : (
          <table className="trace-table" aria-label="Control trace">
            <thead>
              <tr>
                <th scope="col">Case</th>
                <th scope="col">Documents</th>
                <th scope="col">Checked fields</th>
                <th scope="col">Flags</th>
                <th scope="col">Shipment</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((entry) => (
                <CaseRow key={entry.key} entry={entry} {...entity} />
              ))}
              {shipments.map((entry) => (
                <ShipmentRow key={entry.shipment.id} entry={entry} {...entity} />
              ))}
            </tbody>
          </table>
        )}
        {trace.loose.length > 0 ? (
          <div className="trace-loose">
            <span className="trace-loose-title">Also in view</span>
            <ul className="trace-list">
              {trace.loose.map((node) => (
                <li key={node.id}>
                  {isFlag(node) ? <Flags flags={[node]} lit={lit} /> : <Entity node={node} {...entity} />}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
