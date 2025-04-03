const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
    try {
        const { items, total, customerEmail } = req.body;
        
        const order = new Order({
            items,
            total,
            customerEmail: customerEmail || 'cliente@mmomarket.com.br'
        });
        
        await order.save();
        
        return res.status(201).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao criar pedido'
        });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Pedido não encontrado'
            });
        }
        
        return res.status(200).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao buscar pedido'
        });
    }
};

exports.updateOrderStatus = async (orderId, status, paymentId) => {
    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { 
                status,
                paymentId
            },
            { new: true }
        );
        
        return order;
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        throw error;
    }
};