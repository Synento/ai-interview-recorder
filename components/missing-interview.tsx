import Link from 'next/link'

export function MissingInterview() {
  return (
    <>
      <h1>This interview is not on this server</h1>
      <p className="muted">
        Interviews are kept in memory. Restarting the dev server clears them. Create a new one.
      </p>
      <p>
        <Link href="/">Create an interview</Link>
      </p>
    </>
  )
}
