const express = require('express');
const db = require('./db');
const {
    parseAPI,
    parseSMS,
    generateFingerprint
} = require('./parser');
const { matchStudent } = require('./matcher');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve frontend
app.use(express.static('public'));


// ===============================
// HEALTH CHECK
// ===============================
app.get('/api', (req, res) => {
    res.send('API is running...');
});


// ===============================
// GET ALL TRANSACTIONS
// ===============================
app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});


// ===============================
// WEBHOOK (PAYSTACK / MONO)
// ===============================
app.post('/webhook', async (req, res) => {
    try {
        const tx = parseAPI(req.body);

        // Generate fingerprint
        const fingerprint = generateFingerprint(tx);

        // Check duplicate
        db.get(
            `SELECT * FROM transactions WHERE fingerprint = ?`,
            [fingerprint],
            async (err, existing) => {
                if (existing) {
                    console.log('Duplicate transaction ignored');
                    return res.json({ status: 'duplicate' });
                }

                // Match student
                const match = await matchStudent(tx.narration);

                const status = match ? 'matched' : 'unmatched';
                const student_id = match ? match.student_id : null;

                // Insert transaction
                db.run(
                    `INSERT INTO transactions 
                    (amount, sender_name, narration, transaction_time, source_type, source_id, fingerprint, raw_payload, status, student_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        tx.amount,
                        tx.sender_name,
                        tx.narration,
                        tx.timestamp,
                        tx.source_type,
                        tx.source_id,
                        fingerprint,
                        tx.raw_payload,
                        status,
                        student_id
                    ],
                    function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Insert failed' });
                        }

                        console.log('Transaction saved:', tx.amount, status);

                        res.json({
                            status,
                            transaction_id: this.lastID
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid webhook data' });
    }
});


// ===============================
// SMS ENDPOINT (ANDROID GATEWAY)
// ===============================
app.post('/sms', async (req, res) => {
    try {
        const { message, received_at } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'No SMS message provided' });
        }

        const tx = parseSMS(message, received_at || new Date().toISOString());

        const fingerprint = generateFingerprint(tx);

        // Check duplicate
        db.get(
            `SELECT * FROM transactions WHERE fingerprint = ?`,
            [fingerprint],
            async (err, existing) => {
                if (existing) {
                    console.log('Duplicate SMS ignored');
                    return res.json({ status: 'duplicate' });
                }

                const match = await matchStudent(tx.narration);

                const status = match ? 'matched' : 'unmatched';
                const student_id = match ? match.student_id : null;

                db.run(
                    `INSERT INTO transactions 
                    (amount, sender_name, narration, transaction_time, source_type, source_id, fingerprint, raw_payload, status, student_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        tx.amount,
                        tx.sender_name,
                        tx.narration,
                        tx.timestamp,
                        tx.source_type,
                        null,
                        fingerprint,
                        tx.raw_payload,
                        status,
                        student_id
                    ],
                    function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Insert failed' });
                        }

                        console.log('SMS Transaction saved:', tx.amount, status);

                        res.json({
                            status,
                            transaction_id: this.lastID
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid SMS data' });
    }
});


// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
