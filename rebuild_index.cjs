
const fs = require('fs');
const path = require('path');

const lessonsDir = path.join(process.cwd(), 'public/lessons');
const indexPath = path.join(lessonsDir, 'index.json');

const languageNames = {
    chinese: '中文',
    english: 'English',
    japanese: '日本語',
    spanish: 'Español',
    portuguese: 'Português',
    french: 'Français',
    german: 'Deutsch',
    italian: 'Italiano'
};

const languages = [];

const dirs = fs.readdirSync(lessonsDir).filter(f => fs.statSync(path.join(lessonsDir, f)).isDirectory());

// Sort languages to match preferred order if possible, or just alphabetical
const order = ['english', 'chinese', 'japanese', 'spanish', 'portuguese', 'french', 'german', 'italian'];
dirs.sort((a, b) => {
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
});

dirs.forEach(langId => {
    const langPath = path.join(lessonsDir, langId);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json') && f !== 'index.json');

    // Sort files by collection ID if possible, otherwise filename
    files.sort((a, b) => {
        // Try to extract number for sorting if it's a grade file
        const matchA = a.match(/grade-(\d+)/);
        const matchB = b.match(/grade-(\d+)/);
        
        if (matchA && matchB) {
            return parseInt(matchA[1]) - parseInt(matchB[1]);
        }
        return a.localeCompare(b);
    });

    const collections = [];
    files.forEach(file => {
        const filePath = path.join(langPath, file);
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Determine ID and Title
            // Priority: content.id -> filename (without extension)
            // Priority: content.title -> content.grade -> filename
            
            const filenameBase = file.replace(/\.json$/, '');
            const collectionId = content.id || filenameBase;
            const title = content.title || content.grade || filenameBase;

            collections.push({
                id: `${langId}-${collectionId}`,
                name: title,
                path: `${langId}/${file}`,
                collectionId: collectionId
            });
        } catch (e) {
            console.error(`Error reading ${filePath}:`, e);
        }
    });

    if (collections.length > 0) {
        languages.push({
            id: langId,
            name: languageNames[langId] || langId,
            collections: collections
        });
    }
});

const indexContent = {
    languages: languages
};

fs.writeFileSync(indexPath, JSON.stringify(indexContent, null, 2));
console.log('Rebuilt index.json');
