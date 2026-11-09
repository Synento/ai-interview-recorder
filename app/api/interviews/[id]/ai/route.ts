import { runInterviewAiStep } from '@/lib/ai-step'
import { interviews, isInterviewId, manifestSummary } from '@/lib/core'
import { errorResponse, synento } from '@/lib/synento'

export const dynamic = 'force-dynamic'

/** Runs `lib/ai-step.ts`. The starter implementation does not call a model. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isInterviewId(id)) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  const interview = interviews.get(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  try {
    const manifest = await synento().getSessionManifest(interview.sessionId)
    const result = await runInterviewAiStep({
      candidateName: interview.candidateName,
      exportDownloadPath: interview.exportJobId ? `/api/interviews/${id}/export/download` : null,
      interviewId: interview.id,
      manifestSummary: manifestSummary(manifest),
      sessionId: interview.sessionId,
    })
    return Response.json(result)
  } catch (err) {
    return errorResponse(err)
  }
}
