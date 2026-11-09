'use client'

import { Compositor, ReplayAudio, type StreamEvent } from '@synento/player'
import { useEffect, useRef, useState } from 'react'

type ManifestResponse = {
  endTs: number | null
  error?: string
  participants: Array<{ tracks: Array<{ kind: string; ready: boolean }>; userId: string }>
  startTs: number | null
  summary: string
}

type WindowResponse = {
  endTs: number | null
  error?: string
  events: StreamEvent[]
  startTs: number | null
}

type ExportResponse = {
  downloadPath: string | null
  error: string | null
  status: string
}

/**
 * Replay, MP4 export, and the AI stub. Playback is driven from the play
 * button. The effect only stops that loop if the page goes away mid-play.
 */
export function ReviewPanel({ interviewId }: { interviewId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [manifest, setManifest] = useState<ManifestResponse | null>(null)
  const [playStatus, setPlayStatus] = useState('Load the recording, then press play.')
  const [exportStatus, setExportStatus] = useState('No export yet.')
  const [downloadPath, setDownloadPath] = useState<string | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiPluggedIn, setAiPluggedIn] = useState<boolean | null>(null)

  // Stop the playback clock if the page unmounts mid-replay. The loop is
  // started from the play button, not from this effect.
  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  async function loadManifest() {
    const res = await fetch(`/api/interviews/${interviewId}/manifest`)
    const body = (await res.json()) as ManifestResponse
    if (!res.ok) {
      setPlayStatus(body.error ?? 'Could not read the recording.')
      return
    }
    setManifest(body)
    setPlayStatus(
      body.startTs === null
        ? 'Nothing has been recorded yet. Join the call and publish camera and microphone first.'
        : body.summary
    )
  }

  async function play() {
    stopRef.current?.()
    const canvas = canvasRef.current
    if (!canvas) return
    const res = await fetch(`/api/interviews/${interviewId}/manifest`)
    const recorded = (await res.json()) as ManifestResponse
    if (!res.ok) {
      setPlayStatus(recorded.error ?? 'Could not read the recording.')
      return
    }
    if (
      recorded.startTs === null ||
      recorded.endTs === null ||
      recorded.endTs <= recorded.startTs
    ) {
      setPlayStatus('Nothing has been recorded yet.')
      return
    }
    const start = recorded.startTs
    const end = recorded.endTs
    const first = await loadWindow(interviewId, start)
    if (!first) {
      setPlayStatus('Playback failed. An sk_live_ key is required to read the recording.')
      return
    }
    const compositor = new Compositor({ canvas, height: 720, width: 1280 })
    const audio = new ReplayAudio()
    audio.resume()
    let cancelled = false
    let fetching = false
    let buffer = first.events
    let nextFrom = first.endTs ?? end
    const origin = start
    const started = performance.now()
    stopRef.current = () => {
      cancelled = true
      audio.update(buffer, origin, false, 1)
      compositor.dispose()
    }
    const tick = () => {
      if (cancelled) return
      const cursor = Math.min(origin + (performance.now() - started), end)
      if (!fetching && nextFrom < end && cursor > nextFrom - 2000) {
        fetching = true
        const from = nextFrom
        void loadWindow(interviewId, from).then((win) => {
          fetching = false
          if (cancelled || !win || win.endTs === null || win.endTs <= from) return
          buffer = buffer.concat(win.events)
          nextFrom = win.endTs
        })
      }
      compositor.render({ type: 'grid' }, buffer, cursor)
      audio.update(buffer, cursor, true, 1)
      if (cursor < end) {
        requestAnimationFrame(tick)
        return
      }
      audio.update(buffer, cursor, false, 1)
      if (!cancelled) setPlayStatus('End of the recording.')
    }
    setPlayStatus('Playing.')
    requestAnimationFrame(tick)
  }

  function stop() {
    stopRef.current?.()
    stopRef.current = null
    setPlayStatus('Stopped.')
  }

  async function startExport() {
    setExportStatus('Starting export...')
    setDownloadPath(null)
    const res = await fetch(`/api/interviews/${interviewId}/export`, { method: 'POST' })
    const started = (await res.json()) as { error?: string }
    if (!res.ok) {
      setExportStatus(started.error ?? 'Export failed.')
      return
    }
    for (let attempt = 0; attempt < 90; attempt++) {
      await wait(2000)
      const poll = await fetch(`/api/interviews/${interviewId}/export`)
      const status = (await poll.json()) as ExportResponse
      if (!poll.ok) {
        setExportStatus(status.error ?? 'Export failed.')
        return
      }
      if (status.status === 'completed' && status.downloadPath) {
        setDownloadPath(status.downloadPath)
        setExportStatus('MP4 ready.')
        return
      }
      if (status.status === 'failed') {
        setExportStatus(status.error ?? 'Export failed.')
        return
      }
      setExportStatus(`Export ${status.status}.`)
    }
    setExportStatus(
      'Still working. Press the button again. The same layout returns the existing file.'
    )
  }

  async function runAi() {
    setAiText('')
    const res = await fetch(`/api/interviews/${interviewId}/ai`, { method: 'POST' })
    const body = (await res.json()) as { error?: string; pluggedIn?: boolean; summary?: string }
    if (!res.ok) {
      setAiPluggedIn(null)
      setAiText(body.error ?? 'The AI step failed.')
      return
    }
    setAiPluggedIn(body.pluggedIn === true)
    setAiText(body.summary ?? '')
  }

  return (
    <div className="stack">
      <section className="stack">
        <h2>Replay</h2>
        <output className="status">{playStatus}</output>
        {manifest ? (
          <ul>
            {manifest.participants.map((participant) => (
              <li key={participant.userId}>
                {participant.userId}:{' '}
                {participant.tracks
                  .map((track) => `${track.kind}${track.ready ? '' : ' (empty)'}`)
                  .join(', ') || 'no tracks'}
              </li>
            ))}
          </ul>
        ) : null}
        <canvas aria-label="Interview replay" height={720} ref={canvasRef} width={1280} />
        <div className="row">
          <button onClick={() => void loadManifest()} type="button">
            Load recording
          </button>
          <button onClick={() => void play()} type="button">
            Play
          </button>
          <button onClick={stop} type="button">
            Stop
          </button>
        </div>
      </section>

      <section className="stack">
        <h2>MP4 export</h2>
        <p className="muted">
          Grid, landscape. This uses your plan&apos;s export allowance. Asking again for the same
          layout returns the file already made.
        </p>
        <output className="status">{exportStatus}</output>
        <div className="row">
          <button onClick={() => void startExport()} type="button">
            Export MP4
          </button>
          {downloadPath ? <a href={downloadPath}>Download MP4</a> : null}
        </div>
      </section>

      <section className="note stack">
        <h2>Your AI step</h2>
        <p>
          This calls <code>runInterviewAiStep</code> in <code>lib/ai-step.ts</code>. The function in
          this starter does not call a model and does not read an AI API key. Replace it to send the
          MP4, or a transcript you make, to your own model.
        </p>
        {aiPluggedIn === false ? <p className="muted">Stub. No model was called.</p> : null}
        <button onClick={() => void runAi()} type="button">
          Run AI step
        </button>
        {aiText ? <p>{aiText}</p> : null}
      </section>
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function loadWindow(interviewId: string, fromTs: number): Promise<WindowResponse | null> {
  const res = await fetch(
    `/api/interviews/${interviewId}/playback?from_ts=${encodeURIComponent(String(fromTs))}`
  )
  const body = (await res.json()) as WindowResponse
  if (!res.ok || !Array.isArray(body.events)) return null
  return body
}
