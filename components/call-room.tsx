'use client'

import {
  checkSupport,
  SynentoProvider,
  useAudioPlayback,
  useConnectionState,
  useParticipants,
  usePublishCamera,
  useSynentoRoom,
  VideoTile,
} from '@synento/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Role } from '@/lib/core'

export function CallRoom({
  interviewId,
  reviewPath,
  role,
}: {
  interviewId: string
  reviewPath: string
  role: Role
}) {
  return (
    <SynentoProvider getToken={() => fetchToken(interviewId, role)} userId={role}>
      <CallControls reviewPath={reviewPath} role={role} />
    </SynentoProvider>
  )
}

async function fetchToken(interviewId: string, role: Role) {
  const res = await fetch(`/api/interviews/${interviewId}/token`, {
    body: JSON.stringify({ role }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  const body = (await res.json()) as { error?: string; token?: string; wsUrl?: string }
  if (!res.ok || !body.token || !body.wsUrl) {
    throw new Error(body.error ?? 'Could not join')
  }
  return { token: body.token, wsUrl: body.wsUrl }
}

function CallControls({ reviewPath, role }: { reviewPath: string; role: Role }) {
  const room = useSynentoRoom()
  const router = useRouter()
  const { error, state } = useConnectionState()
  const audio = useAudioPlayback()
  const participants = useParticipants()
  const [preview, setPreview] = useState<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState('Join, allow the camera and microphone, then talk.')
  const [left, setLeft] = useState(false)
  usePublishCamera(stream, preview)

  async function start() {
    const support = checkSupport()
    if (!support.supported) {
      setStatus(support.reason ?? 'This browser cannot publish audio and video.')
      return
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      if (preview) preview.srcObject = media
      setStream(media)
      setStatus(`Publishing as ${role}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Camera and microphone were blocked.')
    }
  }

  function leave() {
    room.close()
    if (role === 'interviewer') {
      router.push(reviewPath)
      return
    }
    setLeft(true)
    setStatus('You can close this tab. The interviewer opens the replay.')
  }

  if (left) {
    return <p>{status}</p>
  }

  return (
    <div className="stack">
      <output className="status">
        {error ? error.message : status} Connection: {state}.
      </output>
      {audio.state === 'blocked' ? (
        <button onClick={() => audio.unlock()} type="button">
          Allow sound
        </button>
      ) : null}
      <div className="row">
        <button disabled={stream !== null} onClick={() => void start()} type="button">
          Join and publish
        </button>
        <button onClick={leave} type="button">
          {role === 'interviewer' ? 'End call and open replay' : 'Leave'}
        </button>
      </div>
      <div className="grid">
        <div>
          <p className="muted">You ({role})</p>
          <video autoPlay muted playsInline ref={setPreview} />
        </div>
        <div>
          <p className="muted">Other person</p>
          {participants.length === 0 ? <p className="muted">Waiting for them to join.</p> : null}
          {participants.map((id) => (
            <VideoTile className="tile" key={id} participantId={id} />
          ))}
        </div>
      </div>
    </div>
  )
}
