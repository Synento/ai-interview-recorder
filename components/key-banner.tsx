import { apiKeyProblem } from '@/lib/core'

/** Shown on every page when the server has no secret sk_live_ key. */
export function KeyBanner() {
  const problem = apiKeyProblem(process.env.SYNENTO_API_KEY)
  if (!problem) return null
  return (
    <p className="banner" role="alert">
      {problem}
    </p>
  )
}
