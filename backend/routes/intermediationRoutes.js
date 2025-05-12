// backend/routes/intermediationRoutes.js
const express = require('express');
const router = express.Router();
const intermediationController = require('../controllers/intermediationController');

// Criar pedido de intermediação
router.post('/create', intermediationController.createIntermediation);

// Listar pedidos de intermediação
router.get('/', intermediationController.listIntermediations);

module.exports = router;