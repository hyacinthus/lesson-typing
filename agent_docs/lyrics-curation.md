## Lyrics Lesson Curation Guide

Guidelines for selecting and maintaining lyrics-based typing lessons across all languages.

### Song Selection Criteria

1. **Lyrical quality first** — Choose songs recognized for excellent lyrics/songwriting, not just popularity or catchy melodies.
2. **Artist diversity** — Max 2 songs per artist. Aim for 30+ distinct artists across 50 songs.
3. **Era coverage** — Focus on the last 30 years of popular music, covering multiple decades.
4. **Gender balance** — Include a good mix of male and female artists.
5. **Genre variety** — Mix pop, rock, folk, R&B, etc. within the language's music scene.
6. **Confirm the list with the user before fetching lyrics** — Present the full 50-song list for approval first.

### Lyrics Quality Requirements

1. **Full lyrics only** — Every song must contain the complete lyrics including all repeated sections. Short excerpts are not acceptable.
2. **Correct language** — Lyrics must be in the target language's native script. No romanization (pinyin, romaji, etc.) unless the original lyrics intentionally use it.
3. **No section labels** — Do not include structural labels like "Verse", "Chorus", "Bridge", etc.
4. **Consistent formatting** — One line per phrase, no extra blank lines within a song. Title format: `歌名（歌手）` or equivalent localized format with parentheses.
5. **Validate CJK/native ratio** — For CJK languages, check that the CJK character ratio is reasonable (>50%). A low ratio indicates romanization or corruption.

### Fetching Lyrics Workflow

1. **Primary tool**: Use `gemini` CLI to batch-fetch lyrics (up to ~9 songs per batch).
2. **Fallback**: If `gemini` fails (rate limit, network), try `copilot` CLI.
3. **Copyright refusal**: `copilot` (GPT) tends to refuse lyrics requests. `gemini` is more reliable for this task.
4. **Batch size**: Keep batches at 5-9 songs. Larger batches risk timeouts.
5. **Verify each result**: Check that returned lyrics are complete and in the correct language before using them.

### Building the JSON File

Use a Python script to compile the final JSON. The script should:

1. Read existing file to preserve kept songs (reuse their UUIDs).
2. Generate new UUIDs for new songs.
3. Calculate `characterCount` (total characters) and `cjkCharCount` (CJK characters only) automatically.
4. Set `category` to the dominant genre (e.g., "流行", "Pop", "J-Pop").
5. Set `difficulty` to 4 (default for lyrics).
6. Assign sequential `order` values.

### Validation Checklist

- [ ] Exactly 50 songs
- [ ] No artist has more than 3 songs (ideally max 2)
- [ ] JSON is valid
- [ ] No songs with CJK ratio < 50% (for CJK languages)
- [ ] No songs with 0 CJK characters (indicates romanization)
- [ ] All lyrics are complete (not truncated or excerpted)
