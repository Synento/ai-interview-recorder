import { CreateForm } from '@/components/create-form'

export default function HomePage() {
  return (
    <>
      <h1>AI interview recorder</h1>
      <p className="muted">
        Create a link, send it to the candidate, and join as the interviewer. The call is recorded
        as it happens. Afterwards you can replay it, export an MP4, and run the AI stub.
      </p>
      <CreateForm />
    </>
  )
}
