const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Configuração de middleware
app.use(bodyParser.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas
app.use('/api/payments', paymentRoutes);
app.use('/api/webhook', webhookRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('API do MMOMarket está funcionando!');
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});