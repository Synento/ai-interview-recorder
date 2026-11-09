/** Interview ids are UUIDs. Anything else is treated as unknown. */
const INTERVIEW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Playback windows requested from the API. The maximum the API accepts is 60s. */
export const PLAYBACK_WINDOW_MS = 10_000

export const ROLES = ['candidate', 'interviewer'] as const
export type Role = (typeof ROLES)[number]

const SECRET_KEY_NEEDED =
  'Replay and MP4 export need a secret sk_live_ key. It stays on the server and is never sent to the browser.'

/**
 * Why this process cannot call Synento, or null when `SYNENTO_API_KEY` is a
 * secret `sk_live_` key. An `rk_live_` key can create a session, then the
 * replay and export routes refuse it, so it is rejected here instead.
 */
export function apiKeyProblem(apiKey: string | undefined): string | null {
  const key = apiKey?.trim() ?? ''
  if (key.startsWith('rk_live_')) {
    return `SYNENTO_API_KEY is an rk_live_ restricted key. ${SECRET_KEY_NEEDED} Create an sk_live_ key under API keys in the dashboard and replace this one.`
  }
  if (!key.startsWith('sk_live_')) {
    return key
      ? `SYNENTO_API_KEY is not an sk_live_ key. ${SECRET_KEY_NEEDED}`
      : `SYNENTO_API_KEY is not set. ${SECRET_KEY_NEEDED} Copy .env.example to .env.local and set the key there.`
  }
  return null
}

export type Interview = {
  candidateName: string
  createdAt: string
  exportJobId: string | null
  id: string
  sessionId: string
}

export type ManifestLike = {
  end_ts: number | null
  participants: Array<{
    tracks: Array<{ kind: string; start_ts: number | null }>
    user_id: string
  }>
  start_ts: number | null
}

export type ExportJob = { jobId: string; reused: boolean }

export type ExportPoll = {
  downloadReady: boolean
  error: string | null
  status: string
}

export function isInterviewId(value: string): boolean {
  return INTERVIEW_ID.test(value)
}

export function isRole(value: unknown): value is Role {
  return value === 'candidate' || value === 'interviewer'
}

/** Join and review paths. Tokens are never put in the URL. */
export function interviewPaths(id: string): {
  candidate: string
  interviewer: string
  review: string
} {
  return {
    candidate: `/i/${id}/call?role=candidate`,
    interviewer: `/i/${id}/call?role=interviewer`,
    review: `/i/${id}/review`,
  }
}

/**
 * In-memory interviews for one Node process. A restart forgets them, which is
 * the right default for a starter that has no database.
 */
export function createInterviewBook() {
  const byId = new Map<string, Interview>()
  return {
    create(input: Omit<Interview, 'exportJobId'>): Interview {
      const interview: Interview = { ...input, exportJobId: null }
      byId.set(interview.id, interview)
      return interview
    },
    get(id: string): Interview | undefined {
      return byId.get(id)
    },
    setExportJob(id: string, jobId: string): Interview | undefined {
      const current = byId.get(id)
      if (!current) return undefined
      const next = { ...current, exportJobId: jobId }
      byId.set(id, next)
      return next
    },
  }
}

/**
 * The book the pages and route handlers share. Next bundles those separately,
 * so a module-level Map would be a different one in each bundle. One process
 * still has one `globalThis`.
 */
const interviewBookGlobal = globalThis as typeof globalThis & {
  __aiInterviewBook?: ReturnType<typeof createInterviewBook>
}
export const interviews = interviewBookGlobal.__aiInterviewBook ?? createInterviewBook()
interviewBookGlobal.__aiInterviewBook = interviews

export function playbackQuery(fromTs: number | null): string {
  const params = new URLSearchParams({ window_size: String(PLAYBACK_WINDOW_MS) })
  if (fromTs !== null && Number.isFinite(fromTs)) {
    params.set('from_ts', String(Math.trunc(fromTs)))
  }
  return params.toString()
}

/** Grid landscape is the export the review page always requests. */
export function exportQuery(): string {
  return new URLSearchParams({ layout: 'grid', orientation: 'landscape' }).toString()
}

/** Who actually has media, for the review page and the AI stub. */
export function manifestSummary(manifest: ManifestLike): string {
  if (manifest.participants.length === 0) return 'No participants in the recording.'
  return manifest.participants
    .map((participant) => {
      const kinds = participant.tracks
        .filter((track) => track.start_ts !== null)
        .map((track) => track.kind)
      return `${participant.user_id}: ${kinds.length > 0 ? kinds.join(', ') : 'no media'}`
    })
    .join('; ')
}

export function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const error = (body as { error?: unknown }).error
  if (
    error &&
    typeof error === 'object' &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return fallback
}

/** `GET /v1/sessions/:id/export` returns `{ data: { job_id, reused? } }`. */
export function readExportJob(body: unknown): ExportJob | null {
  if (!body || typeof body !== 'object') return null
  const data = (body as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const jobId = (data as { job_id?: unknown }).job_id
  if (typeof jobId !== 'string' || jobId.length === 0) return null
  return { jobId, reused: (data as { reused?: unknown }).reused === true }
}

/** `GET /v1/exports/:jobId` status, without the API's download path (that path needs the key). */
export function readExportStatus(body: unknown): ExportPoll | null {
  if (!body || typeof body !== 'object') return null
  const data = (body as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const status = (data as { status?: unknown }).status
  if (typeof status !== 'string' || status.length === 0) return null
  const error = (data as { error?: unknown }).error
  return {
    downloadReady: status === 'completed',
    error: typeof error === 'string' ? error : null,
    status,
  }
}
