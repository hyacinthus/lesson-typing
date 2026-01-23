
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

async function mockFetch(url) {
    const filePath = path.join(publicDir, url);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            ok: true,
            json: async () => JSON.parse(content)
        };
    }
    throw new Error(`File not found: ${filePath}`);
}

async function loadLessonIndex() {
    const response = await mockFetch('/lessons/index.json');
    return response.json();
}

async function loadGradeLessons(p) {
    const response = await mockFetch(`/lessons/${p}`);
    return response.json();
}

async function loadAllLessons() {
    const index = await loadLessonIndex();
    const allLessons = [];
    const promises = [];

    for (const lang of index.languages) {
        for (const grade of lang.grades) {
            promises.push(
                loadGradeLessons(grade.path).then((data) => ({
                    data,
                    language: lang.id,
                    gradeId: grade.gradeId || grade.id,
                })).catch(e => {
                    console.error(`Failed to load ${grade.path}: ${e.message}`);
                    return null;
                })
            );
        }
    }

    const results = await Promise.all(promises);

    for (const res of results) {
        if (!res) continue;
        const { data: gradeData, language, gradeId } = res;
        const lessonsWithGrade = gradeData.lessons.map((lesson) => ({
            ...lesson,
            grade: gradeData.grade,
            gradeId: gradeId,
            language: language,
        }));
        allLessons.push(...lessonsWithGrade);
    }

    return allLessons;
}

(async () => {
    try {
        const lessons = await loadAllLessons();
        console.log(`Total lessons loaded: ${lessons.length}`);
        
        ['french', 'german'].forEach(lang => {
            const langLessons = lessons.filter(l => l.language === lang);
            console.log(`Language ${lang}: ${langLessons.length} lessons`);
            
            const uniqueGrades = new Map();
            langLessons.forEach(l => {
                if (!uniqueGrades.has(l.gradeId)) {
                    uniqueGrades.set(l.gradeId, l.grade);
                }
            });
            
            console.log(`  Unique grades: ${uniqueGrades.size}`);
            uniqueGrades.forEach((name, id) => {
                console.log(`    - ${id}: ${name}`);
            });
        });
        
    } catch (e) {
        console.error(e);
    }
})();
