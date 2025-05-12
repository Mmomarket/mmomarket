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
    originalTotal: Number, // Valor antes do desconto
    customerEmail: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    paymentId: String,
    coupon: {
        code: String,
        discount: Number
    },
    referralCode: String, // Para o sistema de afiliados
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);