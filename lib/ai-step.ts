export type AiStepInput = {
  candidateName: string
  /** Same-origin path that streams the MP4. Null until an export has been started. */
  exportDownloadPath: string | null
  interviewId: string
  manifestSummary: string
  sessionId: string
}

export type AiStepResult = {
  /**
   * Stays false until you replace the body of `runInterviewAiStep` with a
   * call to your own model. The review page uses it to mark the stub.
   */
  pluggedIn: boolean
  summary: string
}

/**
 * PLUG IN YOUR MODEL HERE.
 *
 * The review page calls this when the interviewer presses "Run AI step".
 * The function below does not call a model and does not read an AI API key.
 * Replace the body with a request to whatever model you use. `exportDownloadPath`
 * is a route on this app that streams the MP4; the Synento key never leaves
 * the server. A transcript, if you want one, is yours to produce.
 */
export async function runInterviewAiStep(input: AiStepInput): Promise<AiStepResult> {
  const exportNote = input.exportDownloadPath
    ? `An MP4 is available at ${input.exportDownloadPath}.`
    : 'No MP4 has been exported yet.'
  const name = input.candidateName ? `Candidate name: ${input.candidateName}.` : ''
  return {
    pluggedIn: false,
    summary: [
      'No model is connected.',
      `Interview ${input.interviewId}, session ${input.sessionId}.`,
      name,
      `Recording: ${input.manifestSummary}.`,
      exportNote,
      'Edit runInterviewAiStep in lib/ai-step.ts to send the export or a transcript to your model.',
    ]
      .filter((part) => part.length > 0)
      .join(' '),
  }
}
