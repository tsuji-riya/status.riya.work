import { useEffect, useState } from 'react'
import { Avatar, Heading, Label, Link, LinkButton, Spinner, Stack, Text, VisuallyHidden } from '@primer/react'
import { CheckCircleFillIcon, HomeIcon, LinkExternalIcon, XCircleFillIcon } from '@primer/octicons-react'
import { NoiserText } from 'noisytext/react'

// Gatus on the lab k3s cluster (tsuji-riya/lab apps/status); only this path is exposed, with CORS
const SLOTS = 60
const API = `https://status-api.riya.work/api/v1/endpoints/statuses?pageSize=${SLOTS}`
const REFRESH_MS = 60_000

type Result = { success: boolean; duration: number; timestamp: string; status?: number; errors?: string[] }
type Endpoint = { name: string; group: string; key: string; results: Result[] }

// Section order and titles; groups come from gatus.yaml
const groups = [
  { id: 'sites', emoji: '🎀', title: 'Sites' },
  { id: 'cluster', emoji: '☸️', title: 'おうち k3s' },
]

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Screen readers get the real text once; the scramble is visual only.
function Noisy({ text }: { text: string }) {
  if (reducedMotion) return text
  return (
    <>
      <VisuallyHidden>{text}</VisuallyHidden>
      <span aria-hidden="true">
        <NoiserText>{text}</NoiserText>
      </span>
    </>
  )
}

const time = (iso: string | Date) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

function Row({ endpoint }: { endpoint: Endpoint }) {
  const { results } = endpoint
  const last = results.at(-1)
  const up = last?.success ?? false
  const ok = results.filter((r) => r.success).length
  const isSite = endpoint.group === 'sites'
  const pad = Array.from({ length: Math.max(0, SLOTS - results.length) })

  return (
    <li className="row">
      <div className="row-head">
        <span className={up ? 'icon-up' : 'icon-down'}>
          {up ? <CheckCircleFillIcon size={16} /> : <XCircleFillIcon size={16} />}
        </span>
        <Text weight="semibold" className="row-name">
          {isSite ? (
            <Link href={`https://${endpoint.name}`}>
              {endpoint.name} <LinkExternalIcon size={12} />
            </Link>
          ) : (
            endpoint.name
          )}
        </Text>
        {last && <Text className="row-meta">{Math.round(last.duration / 1e6)} ms</Text>}
        <Label variant={up ? 'success' : 'danger'}>{up ? '元気' : 'ダウン'}</Label>
      </div>
      {/* Oldest on the left, newest on the right; empty slots until Gatus has a full hour */}
      <div className="bars" aria-hidden="true">
        {pad.map((_, i) => (
          <span key={`pad-${i}`} className="bar" />
        ))}
        {results.map((r) => (
          <span
            key={r.timestamp}
            className={`bar ${r.success ? 'bar-up' : 'bar-down'}`}
            title={`${time(r.timestamp)} ${r.success ? 'OK' : (r.errors?.[0] ?? `HTTP ${r.status ?? '?'}`)}`}
          />
        ))}
      </div>
      <Text size="small" className="row-meta">
        直近 {results.length} 回のうち {ok} 回 OK
        {!up && last?.errors?.[0] && ` · ${last.errors[0]}`}
      </Text>
    </li>
  )
}

export default function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>()
  const [failed, setFailed] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date>()

  useEffect(() => {
    const load = () =>
      fetch(API)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json() as Promise<Endpoint[]>
        })
        .then((data) => {
          setEndpoints(data)
          setFailed(false)
          setUpdatedAt(new Date())
        })
        .catch(() => setFailed(true))
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const down = endpoints?.filter((e) => !e.results.at(-1)?.success) ?? []
  // The API lives on the cluster itself, so not reaching it means the cluster or its tunnel is down
  const mood = failed
    ? { emoji: '😿', text: 'おうちのクラスタに届かないみたい…' }
    : !endpoints
      ? undefined
      : down.length === 0
        ? { emoji: '😺', text: 'ぜんぶ元気だよ！' }
        : { emoji: '🙀', text: `${down.length} 個ようすがへん…` }

  return (
    <div className="page">
      <header className="header">
        <Stack direction="horizontal" align="center" gap="condensed">
          <Avatar src="/avatar.png" alt="" size={32} />
          <Text weight="semibold" size="large">
            status.riya.work <span aria-hidden="true">🎀</span>
          </Text>
        </Stack>
        <LinkButton href="https://riya.work" leadingVisual={HomeIcon} variant="invisible">
          riya.work
        </LinkButton>
      </header>

      <main className="main">
        <section className="hero" aria-live="polite">
          {mood ? (
            <>
              <span className="hero-emoji" aria-hidden="true">
                {mood.emoji}
              </span>
              <Heading as="h1" className="hero-title">
                <Noisy text={mood.text} />
              </Heading>
              <Text as="p" className="hero-text">
                {updatedAt ? `${time(updatedAt)} に確認 · 1 分ごとに更新` : 'まだ一度も確認できていません'}
              </Text>
            </>
          ) : (
            <Spinner srText="読み込み中" />
          )}
        </section>

        {endpoints &&
          groups.map((group) => {
            const items = endpoints.filter((e) => e.group === group.id)
            if (items.length === 0) return null
            return (
              <section key={group.id} aria-labelledby={group.id} className="group">
                <Heading as="h2" id={group.id} variant="medium" className="section-title">
                  <span aria-hidden="true">{group.emoji}</span> <Noisy text={group.title} />
                </Heading>
                <ul className="card rows">
                  {items.map((e) => (
                    <Row key={e.key} endpoint={e} />
                  ))}
                </ul>
              </section>
            )
          })}
      </main>

      <footer className="footer">
        <Text size="small">
          © riya.work · <Link href="https://github.com/tsuji-riya/lab">tsuji-riya/lab</Link> の Gatus が見張ってます 😺🎀
        </Text>
      </footer>
    </div>
  )
}
