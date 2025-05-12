// backend/controllers/intermediationController.js
const Intermediation = require('../models/Intermediation');

exports.createIntermediation = async (req, res) => {
    try {
        const { 
            game, 
            server, 
            character, 
            otherCharacter,
            whatsapp, 
            otherWhatsapp, 
            tradeDescription 
        } = req.body;
        
        const intermediation = new Intermediation({
            game,
            server,
            character,
            otherCharacter,
            whatsapp,
            otherWhatsapp,
            tradeDescription
        });
        
        await intermediation.save();
        
        return res.status(201).json({
            status: 'success',
            message: 'Pedido de intermediação registrado com sucesso',
            data: intermediation
        });
    } catch (error) {
        console.error('Erro ao criar pedido de intermediação:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao criar pedido de intermediação'
        });
    }
};

exports.listIntermediations = async (req, res) => {
    try {
        const intermediations = await Intermediation.find().sort({ createdAt: -1 });
        
        return res.status(200).json({
            status: 'success',
            count: intermediations.length,
            data: intermediations
        });
    } catch (error) {
        console.error('Erro ao listar intermediações:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao listar intermediações'
        });
    }
};