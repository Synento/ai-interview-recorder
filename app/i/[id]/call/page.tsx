import { CallRoom } from '@/components/call-room'
import { MissingInterview } from '@/components/missing-interview'
import { interviewPaths, interviews, isInterviewId, isRole } from '@/lib/core'

export const dynamic = 'force-dynamic'

export default async function CallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ role?: string }>
}) {
  const { id } = await params
  const { role } = await searchParams
  if (!isInterviewId(id) || !isRole(role)) return <MissingInterview />
  const interview = interviews.get(id)
  if (!interview) return <MissingInterview />
  const paths = interviewPaths(id)
  const title = role === 'interviewer' ? 'Interviewer' : 'Candidate'

  return (
    <>
      <p>
        <a href={`/i/${id}`}>Back to links</a>
      </p>
      <h1>{title}</h1>
      {interview.candidateName ? <p className="muted">{interview.candidateName}</p> : null}
      <CallRoom interviewId={id} reviewPath={paths.review} role={role} />
    </>
  )
}
