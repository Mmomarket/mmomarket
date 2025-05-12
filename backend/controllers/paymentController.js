// backend/controllers/paymentController.js
const { payment: mercadopagoPayment } = require('../config/mercadopago');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const orderController = require('./orderController');

exports.createPayment = async (req, res) => {
    try {
        const { items, total, customerEmail, metadata, couponCode } = req.body;
        
        // Variáveis para calcular o total com desconto
        let finalTotal = total;
        let appliedCoupon = null;
        
        // Verificar se há um cupom aplicado
        if (couponCode) {
            try {
                // Buscar o cupom no banco de dados
                const coupon = await Coupon.findOne({ 
                    code: couponCode.toUpperCase(), 
                    isActive: true, 
                    isUsed: false 
                });
                
                if (coupon) {
                    // Calcular o desconto
                    const discountAmount = (total * coupon.discount) / 100;
                    finalTotal = total - discountAmount;
                    
                    // Armazenar informações do cupom
                    appliedCoupon = {
                        code: coupon.code,
                        discount: coupon.discount
                    };
                }
            } catch (couponError) {
                console.error('Erro ao processar cupom:', couponError);
                // Continuar sem aplicar o cupom
            }
        }
        
        // Criar pedido primeiro
        const orderData = {
            items,
            total: finalTotal, // Total com desconto aplicado
            originalTotal: total, // Total original
            customerEmail: customerEmail || 'cliente@mmomarket.com.br',
            referralCode: req.body.referralCode || null
        };
        
        // Se tiver cupom aplicado, adicionar ao pedido
        if (appliedCoupon) {
            orderData.coupon = appliedCoupon;
        }
        
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
        
        // Adicionar informação de cupom à descrição, se aplicado
        if (appliedCoupon) {
            description += ` (Cupom ${appliedCoupon.code}: ${appliedCoupon.discount}% OFF)`;
        }
        
        // Criar pagamento no MercadoPago - usando a nova sintaxe
        const paymentData = {
            transaction_amount: finalTotal, // Usar valor com desconto aplicado
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
        
        try {
            const payment = await mercadopagoPayment.create({ body: paymentData });
            
            // Salvar os detalhes do pagamento
            const newPayment = new Payment({
                mercadopagoId: payment.id,
                orderId: order._id,
                amount: finalTotal,
                status: payment.status,
                paymentMethod: 'pix',
                paymentDetails: payment
            });
            
            await newPayment.save();
            
            // Atualizar o pedido com o ID do pagamento
            await orderController.updateOrderStatus(
                order._id, 
                'pending', 
                payment.id
            );
            
            // Se um cupom foi aplicado, marcá-lo como usado
            if (appliedCoupon) {
                try {
                    await Coupon.findOneAndUpdate(
                        { code: appliedCoupon.code },
                        { 
                            isUsed: true,
                            usedAt: new Date(),
                            usedBy: customerEmail || 'cliente@mmomarket.com.br'
                        }
                    );
                } catch (couponUpdateError) {
                    console.error('Erro ao atualizar cupom:', couponUpdateError);
                    // Continuar mesmo se falhar ao atualizar o cupom
                }
            }
            
            return res.status(200).json({
                status: 'success',
                data: {
                    payment_id: payment.id,
                    status: payment.status,
                    pix_data: payment.point_of_interaction.transaction_data,
                    order_id: order._id,
                    applied_coupon: appliedCoupon
                }
            });
        } catch (mpError) {
            console.error('Erro ao criar pagamento no MercadoPago:', mpError);
            
            // Se falhar no MercadoPago, excluir o pedido
            await Order.findByIdAndDelete(order._id);
            
            throw new Error(`Erro ao processar pagamento: ${mpError.message}`);
        }
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
        
        const paymentInfo = await mercadopagoPayment.get({ id: payment_id });
        
        if (!paymentInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Pagamento não encontrado'
            });
        }
        
        // Atualizar o status do pagamento no banco de dados
        await Payment.findOneAndUpdate(
            { mercadopagoId: payment_id },
            { 
                status: paymentInfo.status,
                paymentDetails: paymentInfo,
                updatedAt: Date.now()
            }
        );
        
        // Se o pagamento foi aprovado, atualizar o status do pedido
        if (paymentInfo.status === 'approved') {
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
                payment_id: paymentInfo.id,
                status: paymentInfo.status,
                order_id: paymentInfo.metadata.order_id
            }
        });
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao verificar status do pagamento',
            details: error.message
        });
    }
};