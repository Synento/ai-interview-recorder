import { createSynentoClient, type SynentoClient, SynentoError } from '@synento/node'
import { apiKeyProblem } from '@/lib/core'

/** The key stays in this process. Routes pass the browser a connection token instead. */
export function requireApiKey(): string {
  const problem = apiKeyProblem(process.env.SYNENTO_API_KEY)
  if (problem) throw new SynentoError(problem, 500)
  return process.env.SYNENTO_API_KEY?.trim() ?? ''
}

export function synento(): SynentoClient {
  return createSynentoClient({
    apiKey: requireApiKey(),
    baseUrl: process.env.SYNENTO_API_URL?.trim() || undefined,
  })
}

export function apiBaseUrl(): string {
  return (process.env.SYNENTO_API_URL?.trim() || 'https://api.synento.com').replace(/\/+$/, '')
}

export async function synentoFetch(path: string): Promise<Response> {
  return fetch(`${apiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${requireApiKey()}` },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof SynentoError) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 500
    return Response.json({ error: err.message }, { status })
  }
  const message = err instanceof Error ? err.message : 'Request failed'
  return Response.json({ error: message }, { status: 500 })
}
