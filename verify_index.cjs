
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
        console.log(`Language ${langId} has ${lang.grades.length} grades.`);
        lang.grades.forEach(g => {
            console.log(`  - ${g.id}: gradeId=${g.gradeId}, path=${g.path}`);
            if (!g.gradeId) console.error(`    MISSING gradeId for ${g.id}`);
        });
    });

} catch (e) {
    console.error('JSON Error:', e.message);
}
