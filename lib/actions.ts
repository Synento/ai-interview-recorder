'use server'

import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { interviews, isInterviewId } from '@/lib/core'
import { synento } from '@/lib/synento'

export type CreateState = { error: string }

/**
 * Create the session, remember it in this process, and open the share page.
 * The redirect is outside the try so Next's redirect throw is not swallowed.
 */
export async function createInterview(
  _state: CreateState,
  formData: FormData
): Promise<CreateState> {
  const candidateName = String(formData.get('candidateName') ?? '')
    .trim()
    .slice(0, 80)
  let id = ''
  try {
    const session = await synento().createSession({
      name: candidateName ? `Interview: ${candidateName}` : 'Interview',
    })
    id = randomUUID()
    if (!isInterviewId(id)) {
      return { error: 'Could not allocate an interview id.' }
    }
    interviews.create({
      candidateName,
      createdAt: new Date().toISOString(),
      id,
      sessionId: session.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the interview.'
    return { error: message }
  }
  redirect(`/i/${id}`)
}
