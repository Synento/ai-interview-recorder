import { interviews, isInterviewId } from '@/lib/core'
import { errorResponse, synentoFetch } from '@/lib/synento'

export const dynamic = 'force-dynamic'

/** Stream the MP4. The Synento download route needs the API key, so the browser never calls it. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isInterviewId(id)) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  const interview = interviews.get(id)
  if (!interview?.exportJobId) {
    return Response.json({ error: 'No export yet' }, { status: 404 })
  }
  try {
    const upstream = await synentoFetch(
      `/v1/exports/${encodeURIComponent(interview.exportJobId)}/download`
    )
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: 'Export is not ready' }, { status: upstream.status || 404 })
    }
    const headers = new Headers()
    headers.set('content-type', upstream.headers.get('content-type') ?? 'video/mp4')
    headers.set('content-disposition', 'attachment; filename="interview.mp4"')
    return new Response(upstream.body, { headers })
  } catch (err) {
    return errorResponse(err)
  }
}
