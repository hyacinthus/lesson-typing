// Pure anti-cheat validation for a submitted practice run. Kept free of
// Deno/Supabase APIs so it can be unit tested with the frontend test runner.

export interface RunMetrics {
  cpm: number
  wpm: number
  accuracy: number
  duration: number
  totalChars: number
  correctChars: number
  errorChars: number
  effectiveKeystrokes: number
}

export interface RunSubmission extends RunMetrics {
  trace: unknown
}

export interface RunContext {
  /** character_count of the lesson, from the database */
  lessonCharacterCount: number
  /** Seconds between start-practice and submit-practice, measured on the server */
  serverDurationSec: number
}

export interface ValidationResult {
  isValid: boolean
  cheatReason: string | null
}

const MAX_WPM = 150
const MAX_CPM = 750

/** Every metric must be a finite non-negative number; anything else never
 *  comes from the real client and could dodge the checks below (e.g. NaN
 *  comparisons are always false). Returns the offending key. */
export function findInvalidMetric(metrics: Record<keyof RunMetrics, unknown>): string | null {
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return key
    }
  }
  return null
}

function fail(cheatReason: string): ValidationResult {
  return { isValid: false, cheatReason }
}

export function validateRun(run: RunSubmission, ctx: RunContext): ValidationResult {
  const { cpm, wpm, accuracy, duration, totalChars, correctChars, errorChars, effectiveKeystrokes, trace } = run
  const { lessonCharacterCount, serverDurationSec } = ctx

  // Speed sanity check
  if (wpm > MAX_WPM || cpm > MAX_CPM) {
    return fail('Impossible speed')
  }

  // Character count validation against server-side lesson data
  if (totalChars !== lessonCharacterCount) {
    return fail('Character count mismatch')
  }

  // Duration upper-bound check
  if (duration > serverDurationSec + 10) {
    return fail('Duration mismatch (upper)')
  }

  // Raw character throughput check. Unlike the cpm/wpm fields (which are
  // client-claimed), totalChars is validated against the lesson and duration
  // is bounded above, so this cannot be lied around. The 1s floor avoids
  // flagging sub-second runs on tiny lessons where the rounded duration is 0.
  if (totalChars > (Math.max(duration, 1) / 60) * MAX_CPM) {
    return fail('Impossible speed')
  }

  // Accuracy must match the character counts it is supposedly derived from
  // (±1 for rounding). Every typed character is either correct or an error,
  // so the two counts must add up.
  if (correctChars > totalChars || correctChars + errorChars !== totalChars) {
    return fail('Invalid character counts')
  }
  const serverAccuracy = totalChars > 0
    ? Math.round((correctChars / totalChars) * 100)
    : 100
  if (Math.abs(accuracy - serverAccuracy) > 1) {
    return fail('Accuracy mismatch')
  }

  // A keystroke trace is mandatory: every check below is trace-based, so an
  // omitted or malformed trace (non-numbers dodge the comparisons) would
  // bypass them all.
  if (
    !Array.isArray(trace) ||
    trace.length === 0 ||
    !trace.every((t: unknown) => typeof t === 'number' && Number.isFinite(t) && t >= 0)
  ) {
    return fail('Missing or malformed keystroke trace')
  }
  const times = trace as number[]

  // The client appends one trace entry per committed character (deletes
  // remove none, retypes append more), so a legitimate run has at least
  // totalChars entries. A stub trace (e.g. a single entry) would slip past
  // the length-gated checks below. Tolerance of 2 covers bundles built
  // before the engine fix, which dropped the first two entries.
  if (times.length < totalChars - 2) {
    return fail('Incomplete keystroke trace')
  }

  // Trace-based duration lower-bound check
  const typingStartOffsetSec = times[0] / 1000
  const expectedServerTypingDuration = serverDurationSec - typingStartOffsetSec
  if (duration > 0 && duration < expectedServerTypingDuration * 0.3 - 5) {
    return fail('Duration mismatch (lower)')
  }

  // Trace monotonicity and interval checks
  if (times.length > 5) {
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) {
        return fail('Invalid trace: not ascending')
      }
    }

    // Robotic keystroke variance check
    const intervals: number[] = []
    let totalInterval = 0
    for (let i = 1; i < times.length; i++) {
      const diff = times[i] - times[i - 1]
      intervals.push(diff)
      totalInterval += diff
    }
    const mean = totalInterval / intervals.length
    let sumSquares = 0
    for (const diff of intervals) {
      sumSquares += Math.pow(diff - mean, 2)
    }
    const variance = sumSquares / intervals.length
    if (variance < 10) {
      return fail('Robotic keystroke variance')
    }

    // Trace duration vs reported duration check
    const traceDurationSec = times[times.length - 1] / 1000
    if (Math.abs(traceDurationSec - duration) > 5) {
      return fail('Trace duration mismatch')
    }

    // No trace.length === totalChars check: it fails for IME (Chinese) input and backspaces.
  }

  // Server-side CPM verification
  const keystrokesForCpm = effectiveKeystrokes || totalChars
  if (times.length > 1 && keystrokesForCpm > 0) {
    const traceDurationSec = times[times.length - 1] / 1000
    if (traceDurationSec > 0) {
      const serverComputedCpm = Math.round(keystrokesForCpm / (traceDurationSec / 60))
      // 30% tolerance with a floor of 5 cpm so rounding on very slow or
      // very short runs cannot trip it.
      if (Math.abs(serverComputedCpm - cpm) > Math.max(serverComputedCpm * 0.3, 5)) {
        return fail('CPM mismatch with server calculation')
      }
    }
  }

  return { isValid: true, cheatReason: null }
}
