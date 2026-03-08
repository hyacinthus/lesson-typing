const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env from .env or .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const lessonsDir = path.resolve(__dirname, '../lessons');

async function syncLessons() {
  const languages = fs.readdirSync(lessonsDir).filter(f =>
    fs.statSync(path.join(lessonsDir, f)).isDirectory()
  );

  const allRows = [];

  for (const language of languages) {
    const langDir = path.join(lessonsDir, language);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(langDir, file);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`Failed to parse ${filePath}:`, e.message);
        process.exit(1);
      }
      const collectionId = data.id; // e.g. "grade-1"

      for (const lesson of data.lessons) {
        allRows.push({
          id: lesson.id,
          language,
          collection_id: collectionId,
          title: lesson.title,
          category: lesson.category || null,
          difficulty: lesson.difficulty,
          sort_order: lesson.order,
          content: lesson.content,
          character_count: lesson.characterCount,
          chinese_char_count: lesson.chineseCharCount || 0,
        });
      }
    }
  }

  console.log(`Found ${allRows.length} lessons across ${languages.length} languages`);

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('lt_lessons')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
      process.exit(1);
    }
    console.log(`Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} lessons)`);
  }

  // Delete lessons from DB that no longer exist in files
  const localIdSet = new Set(allRows.map(r => r.id));

  // Fetch all existing lesson IDs with pagination to handle >1000 rows
  const dbIds = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data: page, error: fetchError } = await supabase
      .from('lt_lessons')
      .select('id')
      .range(from, from + pageSize - 1);

    if (fetchError) {
      console.error('Error fetching existing lessons:', fetchError);
      process.exit(1);
    }

    for (const row of page) {
      dbIds.push(row.id);
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }

  const orphanIds = dbIds.filter(id => !localIdSet.has(id));

  if (orphanIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('lt_lessons')
      .delete()
      .in('id', orphanIds);

    if (deleteError) {
      console.error('Error deleting orphan lessons:', deleteError);
      process.exit(1);
    }
    console.log(`Deleted ${orphanIds.length} orphaned lessons from DB`);
  }

  console.log('Sync complete!');
}

syncLessons().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
