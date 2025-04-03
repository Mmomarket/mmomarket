const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const orderController = require('../controllers/orderController');

// Criar pagamento
router.post('/create', paymentController.createPayment);

// Verificar status do pagamento
router.get('/status/:payment_id', paymentController.getPaymentStatus);

// Obter informações do pedido
router.get('/order/:id', orderController.getOrderById);

module.exports = router;