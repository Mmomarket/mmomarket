// backend/config/mercadopago.js
const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

// Inicialize a configuração do MercadoPago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Crie instâncias dos recursos que vamos usar
const payment = new Payment(client);

module.exports = {
    client,
    payment
};