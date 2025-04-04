const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Listar todos os pedidos
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao listar pedidos'
        });
    }
});

// Obter um pedido específico por ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Pedido não encontrado'
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao buscar pedido'
        });
    }
});

// Filtrar pedidos por status
router.get('/status/:status', async (req, res) => {
    try {
        const orders = await Order.find({ status: req.params.status }).sort({ createdAt: -1 });
        
        res.status(200).json({
            status: 'success',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('Erro ao filtrar pedidos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao filtrar pedidos'
        });
    }
});

module.exports = router;