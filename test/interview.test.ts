import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { runInterviewAiStep } from '../lib/ai-step.ts'
import {
  apiKeyProblem,
  createInterviewBook,
  exportQuery,
  interviewPaths,
  isInterviewId,
  isRole,
  manifestSummary,
  playbackQuery,
  readErrorMessage,
  readExportJob,
  readExportStatus,
} from '../lib/core.ts'

const sample = {
  candidateName: 'Ada',
  createdAt: '2026-11-04T00:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  sessionId: 'sess_1',
}

describe('interview book', () => {
  it('stores an interview and remembers the export job', () => {
    const book = createInterviewBook()
    const created = book.create(sample)
    assert.equal(created.exportJobId, null)
    assert.equal(book.get(sample.id)?.sessionId, 'sess_1')
    assert.equal(book.setExportJob(sample.id, 'job_1')?.exportJobId, 'job_1')
    assert.equal(book.get('missing'), undefined)
    assert.equal(book.setExportJob('missing', 'job_2'), undefined)
  })

  it('builds join paths with no token in the query', () => {
    const paths = interviewPaths(sample.id)
    assert.equal(paths.candidate, `/i/${sample.id}/call?role=candidate`)
    assert.equal(paths.interviewer, `/i/${sample.id}/call?role=interviewer`)
    assert.equal(paths.review, `/i/${sample.id}/review`)
    assert.equal(paths.candidate.includes('token'), false)
    assert.equal(isInterviewId(sample.id), true)
    assert.equal(isInterviewId('sess_1'), false)
    assert.equal(isRole('candidate'), true)
    assert.equal(isRole('host'), false)
  })
})

describe('Synento response parsing', () => {
  it('reads an export job and a completed status', () => {
    assert.deepEqual(readExportJob({ data: { job_id: 'job_9', reused: true }, error: null }), {
      jobId: 'job_9',
      reused: true,
    })
    assert.equal(readExportJob({ data: {} }), null)
    assert.deepEqual(
      readExportStatus({
        data: { download_url: '/v1/exports/job_9/download', job_id: 'job_9', status: 'completed' },
      }),
      { downloadReady: true, error: null, status: 'completed' }
    )
    assert.equal(
      readExportStatus({ data: { error: 'render failed', status: 'failed' } })?.error,
      'render failed'
    )
    assert.equal(
      readErrorMessage({ error: { message: 'no recordings found' } }, 'fallback'),
      'no recordings found'
    )
  })

  it('asks for a 10s playback window and a grid landscape export', () => {
    assert.equal(playbackQuery(1_700_000_000_000), 'window_size=10000&from_ts=1700000000000')
    assert.equal(playbackQuery(null), 'window_size=10000')
    assert.equal(exportQuery(), 'layout=grid&orientation=landscape')
  })

  it('summarises tracks that actually hold media', () => {
    assert.equal(
      manifestSummary({
        end_ts: 20,
        participants: [
          {
            tracks: [
              { kind: 'cam', start_ts: 1 },
              { kind: 'mic', start_ts: null },
            ],
            user_id: 'interviewer',
          },
        ],
        start_ts: 1,
      }),
      'interviewer: cam'
    )
    assert.equal(
      manifestSummary({ end_ts: null, participants: [], start_ts: null }),
      'No participants in the recording.'
    )
  })
})

describe('API key', () => {
  it('accepts only a secret sk_live_ key', () => {
    assert.equal(apiKeyProblem('sk_live_example'), null)
    assert.equal(apiKeyProblem('  sk_live_example  '), null)
    assert.match(apiKeyProblem(undefined) ?? '', /not set/)
    assert.match(apiKeyProblem('   ') ?? '', /not set/)
    assert.match(apiKeyProblem('rk_live_example') ?? '', /rk_live_ restricted key/)
    assert.match(apiKeyProblem('rk_live_example') ?? '', /sk_live_/)
    assert.match(apiKeyProblem('sk_test_example') ?? '', /not an sk_live_ key/)
  })
})

describe('public repo files', () => {
  it('the readme and licence stand alone', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    assert.match(readme, /sk_live_/)
    assert.match(readme, /server-side only/)
    assert.match(readme, /docs\/screenshot\.png/)
    assert.doesNotMatch(readme, /npm run \w+ -w/)
    assert.doesNotMatch(readme, /workspace:/)
    const license = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8')
    assert.match(license, /MIT License/)
    assert.match(license, /Copyright \(c\) 2026 Synento/)
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    assert.equal(pkg.dependencies['@synento/node'], '^0.6.0')
    assert.equal(pkg.dependencies['@synento/client'], '^0.5.2')
    assert.equal(pkg.dependencies['@synento/react'], '^0.3.0')
    assert.equal(pkg.dependencies['@synento/player'], '^0.4.2')
    assert.equal(JSON.stringify(pkg).includes('workspace:'), false)
  })
})

describe('AI step stub', () => {
  it('does not claim a model ran, and the source does not read a model key', async () => {
    const result = await runInterviewAiStep({
      candidateName: 'Ada',
      exportDownloadPath: null,
      interviewId: sample.id,
      manifestSummary: 'interviewer: cam, mic',
      sessionId: 'sess_1',
    })
    assert.equal(result.pluggedIn, false)
    assert.match(result.summary, /No model is connected/)
    assert.match(result.summary, /lib\/ai-step\.ts/)
    const source = readFileSync(new URL('../lib/ai-step.ts', import.meta.url), 'utf8')
    assert.match(source, /PLUG IN YOUR MODEL HERE/)
    assert.doesNotMatch(source, /process\.env/)
    assert.doesNotMatch(source, /OPENAI|ANTHROPIC|GEMINI|sk-/)
  })
})
