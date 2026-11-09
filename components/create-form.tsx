'use client'

import { useActionState } from 'react'
import { type CreateState, createInterview } from '@/lib/actions'

const initial: CreateState = { error: '' }

export function CreateForm() {
  const [state, action, pending] = useActionState(createInterview, initial)
  return (
    <form action={action} className="stack">
      <label htmlFor="candidateName">
        Candidate name
        <span className="muted"> Optional. Shown on the review page only.</span>
      </label>
      <input autoComplete="off" id="candidateName" maxLength={80} name="candidateName" />
      <button disabled={pending} type="submit">
        {pending ? 'Creating...' : 'Create interview link'}
      </button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  )
}
