const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    mercadopagoId: String,
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    amount: Number,
    status: String,
    paymentMethod: String,
    paymentDetails: Object,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Payment', PaymentSchema);