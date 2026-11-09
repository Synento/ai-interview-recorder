import { interviews, isInterviewId, manifestSummary } from '@/lib/core'
import { errorResponse, synento } from '@/lib/synento'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isInterviewId(id)) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  const interview = interviews.get(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  try {
    const manifest = await synento().getSessionManifest(interview.sessionId)
    return Response.json({
      endTs: manifest.end_ts,
      participants: manifest.participants.map((participant) => ({
        tracks: participant.tracks.map((track) => ({
          kind: track.kind,
          ready: track.start_ts !== null,
        })),
        userId: participant.user_id,
      })),
      startTs: manifest.start_ts,
      summary: manifestSummary(manifest),
    })
  } catch (err) {
    return errorResponse(err)
  }
}
