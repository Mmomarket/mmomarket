// backend/models/Intermediation.js
const mongoose = require('mongoose');

const IntermediationSchema = new mongoose.Schema({
    game: String,
    server: String,
    character: String,
    otherCharacter: String,
    whatsapp: String,
    otherWhatsapp: String,
    tradeDescription: String,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Intermediation', IntermediationSchema);