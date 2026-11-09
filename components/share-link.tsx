'use client'

export function ShareLink({ label, url }: { label: string; url: string }) {
  return (
    <label className="stack">
      {label}
      <input onFocus={(event) => event.currentTarget.select()} readOnly value={url} />
    </label>
  )
}
