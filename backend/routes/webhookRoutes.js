const express = require('express');
const router = express.Router();
const mercadopago = require('../config/mercadopago');
const Payment = require('../models/Payment');
const orderController = require('../controllers/orderController');

router.post('/', async (req, res) => {
    try {
        const { action, data } = req.body;
        
        // Verificar se é uma notificação de pagamento
        if (action === 'payment.updated' || action === 'payment.created') {
            const paymentId = data.id;
            
            // Buscar informações do pagamento
            const paymentInfo = await mercadopago.payment.get(paymentId);
            const payment = paymentInfo.body;
            
            // Atualizar o registro de pagamento
            const paymentRecord = await Payment.findOneAndUpdate(
                { mercadopagoId: paymentId },
                { 
                    status: payment.status,
                    paymentDetails: payment,
                    updatedAt: Date.now()
                },
                { new: true }
            );
            
            // Se o pagamento foi aprovado, atualizar o status do pedido
            if (payment.status === 'approved' && paymentRecord) {
                await orderController.updateOrderStatus(
                    paymentRecord.orderId,
                    'completed',
                    paymentId
                );
                
                console.log(`Pedido ${paymentRecord.orderId} marcado como completo`);
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;