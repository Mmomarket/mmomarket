// backend/controllers/paymentController.js

exports.createPayment = async (req, res) => {
    try {
        const { items, total, originalTotal, customerEmail, metadata, couponCode, referralCode } = req.body;
        
        // Variáveis para calcular o total com desconto
        let finalTotal = total;
        let appliedCoupon = null;
        
        // Verificar se há um cupom aplicado
        if (couponCode) {
            try {
                const Coupon = require('../models/Coupon'); // Importar modelo
                
                // Buscar o cupom no banco de dados
                const coupon = await Coupon.findOne({ 
                    code: couponCode.toUpperCase(), 
                    isActive: true, 
                    isUsed: false 
                });
                
                if (coupon) {
                    // Calcular o desconto (se o cliente não enviou o total já com desconto)
                    if (originalTotal) {
                        // Cliente enviou tanto o total com desconto quanto o original
                        finalTotal = total; // Já está com desconto
                    } else {
                        // Calcular o desconto agora
                        const discountAmount = (total * coupon.discount) / 100;
                        finalTotal = total - discountAmount;
                    }
                    
                    // Armazenar informações do cupom
                    appliedCoupon = {
                        code: coupon.code,
                        discount: coupon.discount
                    };
                    
                    console.log(`Aplicando cupom ${coupon.code}: ${coupon.discount}% de desconto`);
                    console.log(`Total original: ${total}, Total com desconto: ${finalTotal}`);
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
            originalTotal: originalTotal || total, // Total original
            customerEmail: customerEmail || 'cliente@mmomarket.com.br',
            referralCode: referralCode || null
        };
        
        // Se tiver cupom aplicado, adicionar ao pedido
        if (appliedCoupon) {
            orderData.coupon = appliedCoupon;
        }
        
        const Order = require('../models/Order'); // Importar modelo
        
        const order = new Order(orderData);
        await order.save();
        
        // Preparar itens para o MercadoPago
        const mpItems = items.map(item => ({
            id: item.game,
            title: item.gameName,
            description: `${item.quantity} moedas - Servidor: ${item.server}`,
            category_id: 'game_currency',
            quantity: 1,
            unit_price: appliedCoupon ? 
                (item.price * (1 - appliedCoupon.discount/100)) : 
                item.price
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
            transaction_amount: Number(finalTotal.toFixed(2)), // Garantir que é um número com 2 casas decimais
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
        
        console.log("Enviando para MercadoPago:", JSON.stringify(paymentData));
        
        try {
            const { payment: mercadopagoPayment } = require('../config/mercadopago');
            const Payment = require('../models/Payment');
            const orderController = require('./orderController');
            
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
                    const Coupon = require('../models/Coupon'); // Importar modelo se ainda não importado
                    
                    await Coupon.findOneAndUpdate(
                        { code: appliedCoupon.code },
                        { 
                            isUsed: true,
                            usedAt: new Date(),
                            usedBy: customerEmail || 'cliente@mmomarket.com.br'
                        }
                    );
                    
                    console.log(`Cupom ${appliedCoupon.code} marcado como usado`);
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
                    applied_coupon: appliedCoupon,
                    final_amount: finalTotal
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