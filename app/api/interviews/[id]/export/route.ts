import {
  exportQuery,
  interviews,
  isInterviewId,
  readErrorMessage,
  readExportJob,
  readExportStatus,
} from '@/lib/core'
import { errorResponse, synentoFetch } from '@/lib/synento'

export const dynamic = 'force-dynamic'

function interviewOr404(id: string) {
  if (!isInterviewId(id)) return null
  return interviews.get(id) ?? null
}

/** Start a grid landscape export, or return the job already made for that layout. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const interview = interviewOr404(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  try {
    const res = await synentoFetch(
      `/v1/sessions/${encodeURIComponent(interview.sessionId)}/export?${exportQuery()}`
    )
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      return Response.json(
        { error: readErrorMessage(body, 'Export failed') },
        { status: res.status }
      )
    }
    const job = readExportJob(body)
    if (!job) return Response.json({ error: 'Export response had no job id' }, { status: 502 })
    interviews.setExportJob(id, job.jobId)
    return Response.json({ jobId: job.jobId, reused: job.reused })
  } catch (err) {
    return errorResponse(err)
  }
}

/** Poll the export stored for this interview. The browser never sees the API job path. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const interview = interviewOr404(id)
  if (!interview) return Response.json({ error: 'Unknown interview' }, { status: 404 })
  if (!interview.exportJobId) {
    return Response.json({ downloadPath: null, error: null, status: 'none' })
  }
  try {
    const res = await synentoFetch(`/v1/exports/${encodeURIComponent(interview.exportJobId)}`)
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      return Response.json(
        { error: readErrorMessage(body, 'Could not read the export') },
        { status: res.status }
      )
    }
    const poll = readExportStatus(body)
    if (!poll) return Response.json({ error: 'Export status was empty' }, { status: 502 })
    return Response.json({
      downloadPath: poll.downloadReady ? `/api/interviews/${id}/export/download` : null,
      error: poll.error,
      status: poll.status,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
