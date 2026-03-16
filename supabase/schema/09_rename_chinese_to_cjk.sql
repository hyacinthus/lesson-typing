-- Rename chinese_char_count to cjk_char_count for clarity
-- CJK includes Han ideographs, Hiragana, Katakana, and Hangul
alter table public.lt_lessons
  rename column chinese_char_count to cjk_char_count;
