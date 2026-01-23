
const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'public/lessons/index.json');
const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

data.languages.forEach(lang => {
    lang.grades.forEach(grade => {
        // Extract grade-N from id (e.g., chinese-grade-1 -> grade-1)
        const parts = grade.id.split('-');
        // Assuming format language-grade-N or language-grade-N-something?
        // Let's check the IDs.
        // chinese-grade-1
        // english-grade-1
        // So parts are [language, 'grade', number]
        
        if (parts.length >= 3 && parts[1] === 'grade') {
             grade.gradeId = `grade-${parts[2]}`;
        } else {
            console.warn(`Unexpected ID format: ${grade.id}`);
            // Fallback or manual check
            grade.gradeId = grade.id; 
        }
    });
});

fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));
console.log('Updated index.json');
