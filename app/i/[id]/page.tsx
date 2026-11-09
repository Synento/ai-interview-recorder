import { headers } from 'next/headers'
import { MissingInterview } from '@/components/missing-interview'
import { ShareLink } from '@/components/share-link'
import { interviewPaths, interviews, isInterviewId } from '@/lib/core'

export const dynamic = 'force-dynamic'

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isInterviewId(id)) return <MissingInterview />
  const interview = interviews.get(id)
  if (!interview) return <MissingInterview />

  const origin = await pageOrigin()
  const paths = interviewPaths(id)
  const name = interview.candidateName || 'No name given'

  return (
    <>
      <h1>Interview link</h1>
      <p className="muted">
        {name}. Send the candidate link to the other person, then open the interviewer link
        yourself. Both of you press join and allow the camera and microphone.
      </p>
      <div className="stack">
        <ShareLink label="Candidate" url={`${origin}${paths.candidate}`} />
        <ShareLink label="Interviewer" url={`${origin}${paths.interviewer}`} />
        <p>
          <a href={paths.review}>Open the replay</a> after the call. Ending the call as the
          interviewer goes there too.
        </p>
      </div>
    </>
  )
}

async function pageOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3010'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}
