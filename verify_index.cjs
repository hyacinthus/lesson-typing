
const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'public/lessons/index.json');
try {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    console.log('JSON is valid.');
    
    ['french', 'german', 'japanese'].forEach(langId => {
        const lang = data.languages.find(l => l.id === langId);
        if (!lang) {
            console.error(`Language ${langId} not found!`);
            return;
        }
        console.log(`Language ${langId} has ${lang.collections.length} collections.`);
        lang.collections.forEach(c => {
            console.log(`  - ${c.id}: collectionId=${c.collectionId}, path=${c.path}`);
            if (!c.collectionId) console.error(`    MISSING collectionId for ${c.id}`);
        });
    });

} catch (e) {
    console.error('JSON Error:', e.message);
}
