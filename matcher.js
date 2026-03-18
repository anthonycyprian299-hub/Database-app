const db = require('./db');
const { extractInfo } = require('./parser');

// Load students
function getStudents() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM students`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Match logic
async function matchStudent(narration) {
    const students = await getStudents();

    if (!students.length) return null;

    const extracted = extractInfo(narration);

    const name = extracted.possible_name;

    for (let student of students) {
        const full = student.full_name.toLowerCase();

        // Direct match
        if (full.includes(name)) {
            return {
                student_id: student.id,
                confidence: 0.9
            };
        }

        // Alias match
        if (student.aliases) {
            const aliases = JSON.parse(student.aliases);

            for (let alias of aliases) {
                if (name.includes(alias.toLowerCase())) {
                    return {
                        student_id: student.id,
                        confidence: 0.8
                    };
                }
            }
        }
    }

    return null;
}

module.exports = { matchStudent };
