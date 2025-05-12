// backend/routes/couponRoutes.js
const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Criar cupom
router.post('/create', couponController.createCoupon);

// Validar cupom
router.get('/validate/:code', couponController.validateCoupon);

// Marcar cupom como usado
router.post('/use/:code', couponController.useCoupon);

// Listar cupons
router.get('/', couponController.listCoupons);

module.exports = router;