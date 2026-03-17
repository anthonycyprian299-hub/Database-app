const Fuse = require('fuse.js');
const db = require('./db');

function getStudents() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM students`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function matchStudent(narration) {
    const students = await getStudents();

    if (!students.length) return null;

    const fuse = new Fuse(students, {
        keys: ['full_name', 'aliases'],
        threshold: 0.4
    });

    const result = fuse.search(narration);

    if (result.length > 0) {
        return {
            student_id: result[0].item.id,
            confidence: 1 - result[0].score
        };
    }

    return null;
}

module.exports = { matchStudent };
