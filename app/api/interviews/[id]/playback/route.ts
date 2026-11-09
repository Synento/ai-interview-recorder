import { interviews, isInterviewId, playbackQuery, readErrorMessage } from '@/lib/core'
import { errorResponse, synentoFetch } from '@/lib/synento'

export const dynamic = 'force-dynamic'

type PlaybackData = {
  end_ts?: number
  events?: unknown
  start_ts?: number
}

/** One playback window, proxied so the API key stays on the server. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isInterviewId(id)) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  const interview = interviews.get(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })

  const fromRaw = new URL(request.url).searchParams.get('from_ts')
  let fromTs: number | null = null
  if (fromRaw !== null && fromRaw !== '') {
    fromTs = Number(fromRaw)
    if (!Number.isFinite(fromTs)) {
      return Response.json({ error: 'from_ts must be a number' }, { status: 400 })
    }
  }

  try {
    const res = await synentoFetch(
      `/v1/sessions/${encodeURIComponent(interview.sessionId)}/playback?${playbackQuery(fromTs)}`
    )
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      return Response.json(
        { error: readErrorMessage(body, 'Playback failed') },
        { status: res.status }
      )
    }
    const data =
      body && typeof body === 'object' ? (body as { data?: PlaybackData }).data : undefined
    if (!data || !Array.isArray(data.events)) {
      return Response.json({ error: 'Playback response was empty' }, { status: 502 })
    }
    return Response.json({
      endTs: typeof data.end_ts === 'number' ? data.end_ts : null,
      events: data.events,
      startTs: typeof data.start_ts === 'number' ? data.start_ts : null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
