import { MissingInterview } from '@/components/missing-interview'
import { ReviewPanel } from '@/components/review-panel'
import { interviews, isInterviewId } from '@/lib/core'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isInterviewId(id)) return <MissingInterview />
  const interview = interviews.get(id)
  if (!interview) return <MissingInterview />

  return (
    <>
      <p>
        <a href={`/i/${id}`}>Back to links</a>
      </p>
      <h1>After the call</h1>
      {interview.candidateName ? <p className="muted">{interview.candidateName}</p> : null}
      <ReviewPanel interviewId={id} />
    </>
  )
}
