const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Configuração de middleware
app.use(bodyParser.json());

// Configuração CORS robusta para ambiente público
app.use((req, res, next) => {
    // Obter a origem da requisição
    const origin = req.headers.origin;
    
    // Para produção, você pode implementar uma verificação mais restritiva
    // verificando se a origem está em uma lista de domínios permitidos
    const allowedOrigins = [
        process.env.FRONTEND_URL,         // Seu URL principal definido no .env
        'http://mmomarket.com.br',        // Seu domínio principal (adicione quando estiver pronto)
        'https://mmomarket.com.br',       // Versão segura do seu domínio
        'http://www.mmomarket.com.br',    // Variante com www
        'https://www.mmomarket.com.br',   // Variante segura com www
        'https://seu-usuario.github.io'      
    ];
    
    // Em desenvolvimento, permitimos todas as origens
    // Em produção (quando NODE_ENV=production), verificamos se a origem está permitida
    if (process.env.NODE_ENV !== 'production' || (origin && allowedOrigins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Lidar com requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Prosseguir para o próximo middleware
    next();
});

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Adicione este endpoint proxy
app.post('/api/proxy/payment', async (req, res) => {
    try {
        const { endpoint, method, data, headers } = req.body;
        
        // Validação básica para segurança
        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Endpoint inválido'
            });
        }
        
        // Construa a URL completa
        const mercadoPagoBaseUrl = 'https://api.mercadopago.com';
        const url = `${mercadoPagoBaseUrl}${endpoint}`;
        
        // Fazer a requisição para o MercadoPago
        const response = await axios({
            method: method || 'GET',
            url: url,
            data: data || {},
            headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                ...(headers || {})
            }
        });
        
        // Retornar a resposta do MercadoPago
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro no proxy de pagamento:', error);
        
        // Retornar erro estruturado
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: error.message,
            data: error.response?.data
        });
    }
});

// Rotas com diferentes aliases para evitar bloqueio
app.use('/api/payments', paymentRoutes);
app.use('/api/process', paymentRoutes);
app.use('/api/service', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/orders', orderRoutes);

// Servir o painel admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Rota de teste
app.get('/', (req, res) => {
    res.send('API do MMOMarket está funcionando!');
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});