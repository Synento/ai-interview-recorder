import { interviews, isInterviewId, isRole } from '@/lib/core'
import { errorResponse, synento } from '@/lib/synento'

export const dynamic = 'force-dynamic'

/**
 * Mint a connection token for one seat. Called again by the SDK on reconnect,
 * so the token can expire without the page storing it.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isInterviewId(id)) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  const interview = interviews.get(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })

  let role: unknown
  try {
    const body = (await request.json()) as { role?: unknown }
    role = body.role
  } catch {
    return Response.json({ error: 'Expected JSON' }, { status: 400 })
  }
  if (!isRole(role)) {
    return Response.json({ error: 'role must be interviewer or candidate' }, { status: 400 })
  }

  try {
    const client = synento()
    const token = await client.createConnectionToken(interview.sessionId, { userId: role })
    return Response.json({
      token: token.accessToken,
      wsUrl: client.resolveWsUrl({
        requestOrigin: request.headers.get('origin'),
        sessionId: interview.sessionId,
        userId: role,
      }),
    })
  } catch (err) {
    return errorResponse(err)
  }
}
