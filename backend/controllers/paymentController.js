const mercadopago = require('../config/mercadopago');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const orderController = require('./orderController');

exports.createPayment = async (req, res) => {
    try {
        const { items, total, customerEmail, metadata } = req.body;
        
        // Criar pedido primeiro
        const orderData = {
            items,
            total,
            customerEmail: customerEmail || 'cliente@mmomarket.com.br'
        };
        
        const order = new Order(orderData);
        await order.save();
        
        // Preparar itens para o MercadoPago
        const mpItems = items.map(item => ({
            id: item.game,
            title: item.gameName,
            description: `${item.quantity} moedas - Servidor: ${item.server}`,
            category_id: 'game_currency',
            quantity: 1,
            unit_price: item.price
        }));
        
        // Descrição do pedido para o MercadoPago
        let description = items.length > 1 
            ? `Compra MMOMarket: ${items.length} itens` 
            : `Compra MMOMarket: ${items[0].quantity} ${items[0].gameName}`;
        
        // Criar pagamento no MercadoPago
        const paymentData = {
            transaction_amount: total,
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: customerEmail || 'cliente@mmomarket.com.br',
            },
            additional_info: {
                items: mpItems
            },
            metadata: {
                order_id: order._id.toString()
            }
        };
        
        const payment = await mercadopago.payment.create(paymentData);
        
        // Salvar os detalhes do pagamento
        const newPayment = new Payment({
            mercadopagoId: payment.body.id,
            orderId: order._id,
            amount: total,
            status: payment.body.status,
            paymentMethod: 'pix',
            paymentDetails: payment.body
        });
        
        await newPayment.save();
        
        // Atualizar o pedido com o ID do pagamento
        await orderController.updateOrderStatus(
            order._id, 
            'pending', 
            payment.body.id
        );
        
        return res.status(200).json({
            status: 'success',
            data: {
                payment_id: payment.body.id,
                status: payment.body.status,
                pix_data: payment.body.point_of_interaction.transaction_data,
                order_id: order._id
            }
        });
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao processar pagamento',
            details: error.message
        });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { payment_id } = req.params;
        
        const payment = await mercadopago.payment.get(payment_id);
        
        if (!payment) {
            return res.status(404).json({
                status: 'error',
                message: 'Pagamento não encontrado'
            });
        }
        
        // Atualizar o status do pagamento no banco de dados
        await Payment.findOneAndUpdate(
            { mercadopagoId: payment_id },
            { 
                status: payment.body.status,
                paymentDetails: payment.body,
                updatedAt: Date.now()
            }
        );
        
        // Se o pagamento foi aprovado, atualizar o status do pedido
        if (payment.body.status === 'approved') {
            const paymentRecord = await Payment.findOne({ mercadopagoId: payment_id });
            if (paymentRecord) {
                await orderController.updateOrderStatus(
                    paymentRecord.orderId,
                    'completed',
                    payment_id
                );
            }
        }
        
        return res.status(200).json({
            status: 'success',
            data: {
                payment_id: payment.body.id,
                status: payment.body.status,
                order_id: payment.body.metadata.order_id
            }
        });
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao verificar status do pagamento'
        });
    }
};