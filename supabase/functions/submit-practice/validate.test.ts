import { describe, it, expect } from 'vitest'
import { findInvalidMetric, validateRun, type RunSubmission, type RunContext } from './validate.ts'

/** A plausible human run: 100 chars in ~60s with jittered keystrokes. */
function humanTrace(chars: number, totalMs: number): number[] {
  const step = totalMs / chars
  return Array.from({ length: chars }, (_, i) => Math.round(i * step + ((i * 37) % 11) * 5))
}

function goodRun(overrides: Partial<RunSubmission> = {}): RunSubmission {
  const totalChars = 100
  const trace = humanTrace(totalChars, 60_000)
  return {
    cpm: 100, wpm: 20, accuracy: 100, duration: 60,
    totalChars, correctChars: totalChars, errorChars: 0, effectiveKeystrokes: totalChars,
    trace,
    ...overrides,
  }
}

const ctx: RunContext = { lessonCharacterCount: 100, serverDurationSec: 65 }

describe('findInvalidMetric', () => {
  const { cpm, wpm, accuracy, duration, totalChars, correctChars, errorChars, effectiveKeystrokes } = goodRun()
  const base = { cpm, wpm, accuracy, duration, totalChars, correctChars, errorChars, effectiveKeystrokes }
  it('accepts finite non-negative numbers', () => {
    expect(findInvalidMetric(base)).toBeNull()
  })
  it.each([
    ['NaN', NaN], ['Infinity', Infinity], ['negative', -1], ['string', '100'], ['undefined', undefined],
  ])('rejects %s', (_name, value) => {
    expect(findInvalidMetric({ ...base, cpm: value })).toBe('cpm')
  })
})

describe('validateRun', () => {
  it('accepts a plausible human run', () => {
    expect(validateRun(goodRun(), ctx)).toEqual({ isValid: true, cheatReason: null })
  })

  it('accepts a run with mistakes when the counts and accuracy agree', () => {
    const run = goodRun({ correctChars: 90, errorChars: 10, accuracy: 90 })
    expect(validateRun(run, ctx).isValid).toBe(true)
  })

  it.each([
    ['wpm over the cap', { wpm: 151 }, 'Impossible speed'],
    ['cpm over the cap', { cpm: 751 }, 'Impossible speed'],
    ['wrong character count', { totalChars: 99, correctChars: 99 }, 'Character count mismatch'],
    ['duration longer than the server saw', { duration: 80 }, 'Duration mismatch (upper)'],
    ['counts that do not add up', { correctChars: 90, errorChars: 5 }, 'Invalid character counts'],
    ['accuracy inconsistent with counts', { correctChars: 90, errorChars: 10, accuracy: 100 }, 'Accuracy mismatch'],
    ['missing trace', { trace: undefined }, 'Missing or malformed keystroke trace'],
    ['trace with non-numbers', { trace: ['a', 1, 2] }, 'Missing or malformed keystroke trace'],
    ['stub trace', { trace: humanTrace(10, 60_000) }, 'Incomplete keystroke trace'],
    ['non-ascending trace', { trace: [...humanTrace(99, 60_000), 5] }, 'Invalid trace: not ascending'],
    ['robotic constant intervals', { trace: Array.from({ length: 100 }, (_, i) => i * 600) }, 'Robotic keystroke variance'],
    ['trace duration far from reported duration', { duration: 50, trace: humanTrace(100, 60_000) }, 'Trace duration mismatch'],
    ['cpm far from what the trace implies', { cpm: 60 }, 'CPM mismatch with server calculation'],
  ])('flags %s', (_name, overrides, reason) => {
    const run = goodRun(overrides as Partial<RunSubmission>)
    expect(validateRun(run, ctx)).toEqual({ isValid: false, cheatReason: reason })
  })

  it('flags too many characters for the reported duration even when cpm is understated', () => {
    // 100 chars claimed in 3 seconds: 2000 chars/min regardless of the cpm field
    const run = goodRun({ duration: 3, cpm: 100, trace: humanTrace(100, 3_000) })
    expect(validateRun(run, { ...ctx, serverDurationSec: 5 }).cheatReason).toBe('Impossible speed')
  })

  it('flags a duration far shorter than the server-observed typing time', () => {
    // Server saw 300s between start and submit, client claims 20s.
    const run = goodRun({ duration: 20, cpm: 300, trace: humanTrace(100, 20_000) })
    expect(validateRun(run, { ...ctx, serverDurationSec: 300 }).cheatReason).toBe('Duration mismatch (lower)')
  })

  it('tolerates rounding on very slow runs', () => {
    // 20 chars over ~9.5 minutes: server computes 2 cpm, client reports 4.
    const trace = humanTrace(20, 600_000)
    const duration = Math.round(trace[trace.length - 1] / 1000)
    const run = goodRun({ totalChars: 20, correctChars: 20, effectiveKeystrokes: 20, cpm: 4, wpm: 1, duration, trace })
    expect(validateRun(run, { lessonCharacterCount: 20, serverDurationSec: duration + 5 })).toEqual({ isValid: true, cheatReason: null })
  })

  it('does not require one trace entry per character for IME input', () => {
    // Chinese commits several characters per trace timestamp; deletes add
    // entries. Two fewer entries than characters is still accepted.
    const run = goodRun({ trace: humanTrace(98, 60_000) })
    expect(validateRun(run, ctx).isValid).toBe(true)
  })
})
