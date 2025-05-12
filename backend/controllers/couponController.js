// backend/controllers/couponController.js
const Coupon = require('../models/Coupon');

// Gerar um código de cupom único
function generateCouponCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Criar um novo cupom
exports.createCoupon = async (req, res) => {
    try {
        const { discount } = req.body;
        
        // Validar desconto (apenas 5%, 10% ou 15%)
        if (![5, 10, 15].includes(Number(discount))) {
            return res.status(400).json({
                status: 'error',
                message: 'Desconto inválido. Use apenas 5, 10 ou 15.'
            });
        }
        
        // Gerar código único
        let code = generateCouponCode();
        let codeExists = await Coupon.findOne({ code });
        
        // Garantir que o código seja único
        while (codeExists) {
            code = generateCouponCode();
            codeExists = await Coupon.findOne({ code });
        }
        
        const coupon = new Coupon({
            code,
            discount: Number(discount)
        });
        
        await coupon.save();
        
        return res.status(201).json({
            status: 'success',
            message: 'Cupom criado com sucesso',
            data: coupon
        });
    } catch (error) {
        console.error('Erro ao criar cupom:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao criar cupom'
        });
    }
};

// Validar um cupom
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        
        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
            isActive: true,
            isUsed: false
        });
        
        if (!coupon) {
            return res.status(404).json({
                status: 'error',
                message: 'Cupom inválido ou já utilizado'
            });
        }
        
        return res.status(200).json({
            status: 'success',
            message: 'Cupom válido',
            data: {
                code: coupon.code,
                discount: coupon.discount
            }
        });
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao validar cupom'
        });
    }
};

// Marcar cupom como usado
exports.useCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const { email } = req.body;
        
        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
            isActive: true,
            isUsed: false
        });
        
        if (!coupon) {
            return res.status(404).json({
                status: 'error',
                message: 'Cupom inválido ou já utilizado'
            });
        }
        
        // Marcar como usado
        coupon.isUsed = true;
        coupon.usedAt = new Date();
        coupon.usedBy = email || 'cliente@mmomarket.com.br';
        
        await coupon.save();
        
        return res.status(200).json({
            status: 'success',
            message: 'Cupom utilizado com sucesso',
            data: coupon
        });
    } catch (error) {
        console.error('Erro ao usar cupom:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao usar cupom'
        });
    }
};

// Listar todos os cupons (para administração)
exports.listCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        
        return res.status(200).json({
            status: 'success',
            count: coupons.length,
            data: coupons
        });
    } catch (error) {
        console.error('Erro ao listar cupons:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao listar cupons'
        });
    }
};