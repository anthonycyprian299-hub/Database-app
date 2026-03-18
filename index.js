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
    console.log("RAW BODY:", req.body);

    const payload = req.body.data || req.body;

    if (!payload) {
      return res.status(400).json({ error: "No payload received" });
    }

    const transaction = {
      amount: payload.amount,
      sender_name: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim(),
      narration: payload.metadata?.narration || "No narration",
      transaction_time: payload.paid_at || new Date().toISOString(),
      source_type: "API",
      source_id: payload.reference
    };

    console.log("NORMALIZED:", transaction);

    res.json({
      status: "success",
      data: transaction
    });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
});
