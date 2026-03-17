const express = require('express');
const cors = require('cors');

const db = require('./db');
const { parseAPI, parseSMS, generateFingerprint } = require('./parser');
const { matchStudent } = require('./matcher');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check
app.get('/', (req, res) => {
    res.send('🚀 Server is running');
});


// 📥 WEBHOOK (API PAYMENTS)
app.post('/webhook', async (req, res) => {
    try {
        const tx = parseAPI(req.body);
        await saveTransaction(tx);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});


// 📡 SMS ENDPOINT
app.post('/sms', async (req, res) => {
    try {
        const { message, received_at } = req.body;

        const tx = parseSMS(message, received_at);
        await saveTransaction(tx);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});


// 💾 SAVE TRANSACTION
function saveTransaction(tx) {
    return new Promise(async (resolve, reject) => {
        try {
            const fingerprint = generateFingerprint(tx);

            const match = await matchStudent(tx.narration);

            db.run(
                `INSERT INTO transactions 
                (amount, sender_name, narration, transaction_time, source_type, source_id, fingerprint, raw_payload, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tx.amount,
                    tx.sender_name,
                    tx.narration,
                    tx.timestamp,
                    tx.source_type,
                    tx.source_id,
                    fingerprint,
                    tx.raw_payload,
                    match ? 'matched' : 'unmatched'
                ],
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            console.log('⚠️ Duplicate ignored');
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log('✅ Saved transaction ID:', this.lastID);
                        resolve();
                    }
                }
            );
        } catch (err) {
            reject(err);
        }
    });
}


// 📊 GET TRANSACTIONS
app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});


// ➕ ADD STUDENT
app.post('/students', (req, res) => {
    const { full_name, class: studentClass, aliases } = req.body;

    db.run(
        `INSERT INTO students (full_name, class, aliases) VALUES (?, ?, ?)`,
        [full_name, studentClass, JSON.stringify(aliases || [])],
        function (err) {
            if (err) return res.status(500).json(err);
            res.json({ id: this.lastID });
        }
    );
});


app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
