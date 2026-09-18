import { useEffect, useState } from 'react'

type ReadyResponse = {
  status: string
  reason?: string
  keys?: Record<string, boolean>
}

function App() {
  const [ready, setReady] = useState<ReadyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health/ready')
      .then(async (res) => setReady((await res.json()) as ReadyResponse))
      .catch((err: unknown) => setError(String(err)))
  }, [])

  const rows: [string, string][] = error
    ? [['request', error]]
    : ready
      ? [
          ['status', ready.status],
          ...(ready.reason ? ([['reason', ready.reason]] as [string, string][]) : []),
          ...Object.entries(ready.keys ?? {}).map(([k, v]) => [`key: ${k}`, String(v)] as [string, string])
        ]
      : []

  return (
    <main>
      <h1>Averis</h1>
      <h2>API readiness</h2>
      {rows.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <table>
          <tbody>
            {rows.map(([name, value]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

export default App
