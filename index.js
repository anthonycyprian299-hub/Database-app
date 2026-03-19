// ---------------------------
// index.js
// Clean version for Render deployment
// ---------------------------

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Important: parse JSON

// Test route
app.get('/', (req, res) => {
  res.send('School Tuition Verification API is live!');
});

// ---------------------------
// Webhook route
// ---------------------------
app.post('/webhook',async (req, res) => {
  try {
    console.log("RAW BODY:", req.body;

    // Accept both data formats
    const payload = req.body.data || req.body;

    if (!payload) {
      return res.status(400).json({ error: "No payload received" });
    }

    // Normalize transaction
    const transaction = {
      amount: payload.amount,
      sender_name: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim(),
      narration: payload.metadata?.narration || "No narration",
      transaction_time: payload.paid_at || new Date().toISOString(),
      source_type: "API",
      source_id: payload.reference
    };

    console.log("NORMALIZED:", transaction);

    // TODO: connect parser.js & matches.js here

    res.json({
      status: "success",
      data: transaction
    });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------
// Start server
// ---------------------------
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});