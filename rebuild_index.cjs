
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
const order = ['chinese', 'english', 'japanese', 'spanish', 'portuguese', 'french', 'german', 'italian'];
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
    const files = fs.readdirSync(langPath).filter(f => f.match(/^grade-\d+\.json$/));
    
    // Sort files by grade number
    files.sort((a, b) => {
        const numA = parseInt(a.match(/grade-(\d+)/)[1]);
        const numB = parseInt(b.match(/grade-(\d+)/)[1]);
        return numA - numB;
    });

    const grades = [];
    files.forEach(file => {
        const filePath = path.join(langPath, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const gradeNum = file.match(/grade-(\d+)/)[1];
        
        grades.push({
            id: `${langId}-grade-${gradeNum}`,
            name: content.grade, // Use the grade name from the file
            path: `${langId}/${file}`,
            gradeId: `grade-${gradeNum}`
        });
    });

    if (grades.length > 0) {
        languages.push({
            id: langId,
            name: languageNames[langId] || langId,
            grades: grades
        });
    }
});

const indexContent = {
    languages: languages
};

fs.writeFileSync(indexPath, JSON.stringify(indexContent, null, 2));
console.log('Rebuilt index.json');
