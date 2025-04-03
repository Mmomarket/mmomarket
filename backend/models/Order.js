const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    items: [{
        game: String,
        gameName: String,
        server: String,
        character: String,
        quantity: Number,
        price: Number
    }],
    total: Number,
    customerEmail: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    paymentId: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);