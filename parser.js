const crypto = require('crypto');

// Clean narration text
function cleanText(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // remove symbols
        .replace(/\b(trf|from|mrs|mr|payment|received|ngn)\b/g, '') // remove noise words
        .trim();
}

// Extract useful info from narration
function extractInfo(narration) {
    const cleaned = cleanText(narration);

    const words = cleaned.split(' ').filter(Boolean);

    return {
        possible_name: words.slice(0, 2).join(' '), // first 2 words
        raw: cleaned
    };
}

// Fingerprint (unchanged)
function roundTime(dateString) {
    const date = new Date(dateString);
    date.setSeconds(0, 0);
    return date.toISOString();
}

function generateFingerprint(tx) {
    const base = `
        ${tx.amount}
        ${tx.sender_name?.toLowerCase().trim()}
        ${roundTime(tx.timestamp)}
        ${tx.narration?.toLowerCase().trim()}
    `;

    return crypto.createHash('sha256').update(base).digest('hex');
}

// API parser
function parseAPI(payload) {
    const data = payload.data;

    if (!data) throw new Error('Invalid API payload');

    return {
        amount: data.amount / 100,
        sender_name: `${data.customer?.first_name || ''} ${data.customer?.last_name || ''}`.trim(),
        narration: data.metadata?.narration || '',
        timestamp: data.paid_at,
        source_type: 'API',
        source_id: data.reference || null,
        raw_payload: JSON.stringify(payload)
    };
}

// SMS parser
function parseSMS(message, received_at) {
    const amountMatch = message.match(/NGN\s?([\d,]+)/i);
    const senderMatch = message.match(/from\s(.+?)(\/|$)/i);
    const narrationMatch = message.match(/from\s(.+)/i);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    const sender = senderMatch ? senderMatch[1] : "Unknown";
    const narration = narrationMatch ? narrationMatch[1] : "";

    return {
        amount,
        sender_name: sender,
        narration,
        timestamp: received_at,
        source_type: 'SMS',
        source_id: null,
        raw_payload: message
    };
}

module.exports = {
    parseAPI,
    parseSMS,
    generateFingerprint,
    extractInfo
};
