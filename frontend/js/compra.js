document.addEventListener('DOMContentLoaded', function() {
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get('game');
    
    // API URL
    const API_URL = 'http://localhost:3000/api';
    
    // Dados dos jogos (em um cenário real, esses dados viriam de uma API ou banco de dados)
    const games = {
        'cabal': {
            name: 'Cabal Alz',
            image: 'images/cabal.jpg',
            servers: ['America', 'Brazil', 'Europe'],
            currency: 'Alz',
            pricePerUnit: 0.01,
            increment: 1000
        },
        'dofus': {
            name: 'Dofus Kamas',
            image: 'images/dofus.jpg',
            servers: ['Ilyzaelle', 'Merkator', 'Echo'],
            currency: 'Kamas',
            pricePerUnit: 0.005,
            increment: 1000000
        },
        'habbo': {
            name: 'Habbo Moedas',
            image: 'images/habbo.jpg',
            servers: ['BR', 'COM', 'ES'],
            currency: 'Moedas',
            pricePerUnit: 0.02,
            increment: 100
        },
        'albion': {
            name: 'Albion Pratas',
            image: 'images/albion.jpg',
            servers: ['América do Norte', 'Europa', 'Ásia'],
            currency: 'Pratas',
            pricePerUnit: 0.003,
            increment: 10000
        },
        'ragnarok': {
            name: 'Ragnarok Zeny',
            image: 'images/ragnarok.jpg',
            servers: ['bRO Thor', 'bRO Valhalla', 'Asgard Legend'],
            currency: 'Zeny',
            pricePerUnit: 0.0001,
            increment: 10000000
        },
        'secondlife': {
            name: 'Second Life Lindens',
            image: 'images/secondlife.jpg',
            servers: ['Main Grid'],
            currency: 'Lindens',
            pricePerUnit: 0.015,
            increment: 100
        },
        'throne': {
            name: 'T&L Lucent',
            image: 'images/throne.jpg',
            servers: ['SA', 'NA', 'EU', 'SEA'],
            currency: 'Lucent',
            pricePerUnit: 0.007,
            increment: 1000
        }
    };
    
    // Se não houver jogo especificado, redirecionar para a lista de jogos
    if (!game || !games[game]) {
        window.location.href = 'listajogos.html';
        return;
    }
    
    // Configurar a página de acordo com o jogo
    const gameData = games[game];
    document.getElementById('game-title').textContent = `${gameData.name} ${gameData.increment}`;
    document.getElementById('game-img').src = gameData.image;
    document.getElementById('game-img').alt = gameData.name;
    document.title = `MMOMarket - ${gameData.name}`;
    
    // Configurar o seletor de servidor
    const serverSelect = document.getElementById('server');
    gameData.servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server;
        option.textContent = server;
        serverSelect.appendChild(option);
    });
    
    // Configurar seletor de quantidade
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decrease');
    const increaseBtn = document.getElementById('increase');
    
    // Definir a quantidade inicial e mínima
    quantityInput.value = gameData.increment;
    quantityInput.min = gameData.increment;
    
    // Calcular preço inicial
    updatePrice();
    
    // Adicionar event listeners para os botões de quantidade
    decreaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > gameData.increment) {
            quantityInput.value = currentValue - gameData.increment;
            updatePrice();
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + gameData.increment;
        updatePrice();
    });
    
    // Função para atualizar o preço
    function updatePrice() {
        const quantity = parseInt(quantityInput.value);
        const price = quantity * gameData.pricePerUnit;
        document.getElementById('price').textContent = `R$ ${price.toFixed(2)}`;
    }
    
    // Configurar botão de compra
    const buyNowBtn = document.getElementById('buy-now');
    buyNowBtn.addEventListener('click', async function() {
        if (!serverSelect.value) {
            alert('Por favor, selecione um servidor.');
            return;
        }
        
        const quantity = parseInt(quantityInput.value);
        const characterName = document.getElementById('character-name').value;
        if (!characterName.trim()) {
            alert('Por favor, informe o nome do seu personagem.');
            return;
        }
        const price = quantity * gameData.pricePerUnit;
        
        // Exibir o modal de pagamento
        const paymentModal = document.getElementById('payment-modal');
        document.getElementById('payment-amount').textContent = `R$ ${price.toFixed(2)}`;
        
        // Mostrar loader
        const qrcodeContainer = document.getElementById('qrcode-container');
        qrcodeContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Gerando pagamento...</p>
            </div>
        `;
        
        paymentModal.style.display = 'block';
        
        try {
            // Dados para enviar ao backend
            const paymentData = {
                items: [{
                    game: game,
                    gameName: gameData.name,
                    server: serverSelect.value,
                    character: characterName,
                    quantity: quantity,
                    price: price
                }],
                total: price,
                customerEmail: 'cliente@mmomarket.com.br'
            };
            
            // Fazer requisição para criar pagamento
            const response = await fetch(`${API_URL}/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                const pixData = result.data.pix_data;
                const orderId = result.data.order_id;
                const paymentId = result.data.payment_id;
                
                // Salvar dados na localStorage para verificação posterior
                localStorage.setItem('current_payment', JSON.stringify({
                    order_id: orderId,
                    payment_id: paymentId
                }));
                
                // Mostrar QR Code
                qrcodeContainer.innerHTML = `
                    <img src="data:image/png;base64,${pixData.qr_code_base64}" alt="QR Code PIX">
                    <p class="pix-code-text">Código PIX copia e cola:</p>
                    <div class="pix-code-container">
                        <code class="pix-code">${pixData.qr_code}</code>
                        <button class="copy-button" id="copy-pix-code">Copiar</button>
                    </div>
                `;
                
                // Adicionar funcionalidade para copiar código
                document.getElementById('copy-pix-code').addEventListener('click', function() {
                    navigator.clipboard.writeText(pixData.qr_code).then(function() {
                        this.textContent = "Copiado!";
                        setTimeout(() => {
                            this.textContent = "Copiar";
                        }, 2000);
                    }.bind(this));
                });
                
                // Iniciar verificação de pagamento
                checkPaymentStatus(paymentId);
            } else {
                qrcodeContainer.innerHTML = `
                    <div class="payment-error">
                        <p>Erro ao gerar pagamento. Por favor, tente novamente.</p>
                        <button id="try-again" class="primary-btn">Tentar Novamente</button>
                    </div>
                `;
                
                document.getElementById('try-again').addEventListener('click', function() {
                    paymentModal.style.display = 'none';
                });
            }
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            qrcodeContainer.innerHTML = `
                <div class="payment-error">
                    <p>Erro ao conectar com o servidor. Por favor, tente novamente.</p>
                    <button id="try-again" class="primary-btn">Tentar Novamente</button>
                </div>
            `;
            
            document.getElementById('try-again').addEventListener('click', function() {
                paymentModal.style.display = 'none';
            });
        }
    });
    
    // Função para verificar status do pagamento
    function checkPaymentStatus(paymentId) {
        const checkInterval = setInterval(async function() {
            try {
                const response = await fetch(`${API_URL}/payments/status/${paymentId}`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    const paymentStatus = result.data.status;
                    
                    // Se o pagamento foi aprovado
                    if (paymentStatus === 'approved') {
                        clearInterval(checkInterval);
                        
                        // Fechar o modal de pagamento
                        const paymentModal = document.getElementById('payment-modal');
                        paymentModal.style.display = 'none';
                        
                        // Exibir o modal de confirmação
                        const confirmationModal = document.getElementById('confirmation-modal');
                        confirmationModal.style.display = 'block';
                        
                        // Limpar dados do pagamento atual
                        localStorage.removeItem('current_payment');
                    }
                    // Se o pagamento falhou
                    else if (['rejected', 'cancelled', 'refunded'].includes(paymentStatus)) {
                        clearInterval(checkInterval);
                        
                        const qrcodeContainer = document.getElementById('qrcode-container');
                        qrcodeContainer.innerHTML = `
                            <div class="payment-error">
                                <p>Pagamento ${paymentStatus === 'rejected' ? 'rejeitado' : 'cancelado'}. Por favor, tente novamente.</p>
                                <button id="try-again" class="primary-btn">Tentar Novamente</button>
                            </div>
                        `;
                        
                        document.getElementById('try-again').addEventListener('click', function() {
                            const paymentModal = document.getElementById('payment-modal');
                            paymentModal.style.display = 'none';
                            localStorage.removeItem('current_payment');
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar status do pagamento:', error);
            }
        }, 5000); // Verificar a cada 5 segundos
        
        // Configurar botão de confirmar pagamento para verificar manualmente
        const confirmPaymentBtn = document.getElementById('confirm-payment');
        confirmPaymentBtn.addEventListener('click', async function() {
            const qrcodeContainer = document.getElementById('qrcode-container');
            
            // Mostrar mensagem de verificação
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'payment-verification';
            loadingMessage.innerHTML = `
                <div class="spinner"></div>
                <p>Verificando pagamento...</p>
            `;
            qrcodeContainer.appendChild(loadingMessage);
            
            try {
                const response = await fetch(`${API_URL}/payments/status/${paymentId}`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    const paymentStatus = result.data.status;
                    
                    // Remover mensagem de verificação
                    qrcodeContainer.removeChild(loadingMessage);
                    
                    if (paymentStatus === 'approved') {
                        clearInterval(checkInterval);
                        
                        // Fechar o modal de pagamento
                        const paymentModal = document.getElementById('payment-modal');
                        paymentModal.style.display = 'none';
                        
                        // Exibir o modal de confirmação
                        const confirmationModal = document.getElementById('confirmation-modal');
                        confirmationModal.style.display = 'block';
                        
                        // Limpar dados do pagamento atual
                        localStorage.removeItem('current_payment');
                    } else {
                        const verificationMessage = document.createElement('div');
                        verificationMessage.className = 'payment-notification';
                        verificationMessage.innerHTML = `
                            <p>Pagamento ainda não confirmado. Por favor, aguarde ou verifique se você completou o pagamento.</p>
                        `;
                        qrcodeContainer.appendChild(verificationMessage);
                        
                        // Remover a mensagem após alguns segundos
                        setTimeout(() => {
                            if (qrcodeContainer.contains(verificationMessage)) {
                                qrcodeContainer.removeChild(verificationMessage);
                            }
                        }, 5000);
                    }
                } else {
                    // Remover mensagem de verificação
                    qrcodeContainer.removeChild(loadingMessage);
                    
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'payment-notification error';
                    errorMessage.innerHTML = `
                        <p>Erro ao verificar pagamento. Por favor, tente novamente.</p>
                    `;
                    qrcodeContainer.appendChild(errorMessage);
                    
                    // Remover a mensagem após alguns segundos
                    setTimeout(() => {
                        if (qrcodeContainer.contains(errorMessage)) {
                            qrcodeContainer.removeChild(errorMessage);
                        }
                    }, 5000);
                }
            } catch (error) {
                console.error('Erro ao verificar status do pagamento:', error);
                
                // Remover mensagem de verificação
                qrcodeContainer.removeChild(loadingMessage);
                
                const errorMessage = document.createElement('div');
                errorMessage.className = 'payment-notification error';
                errorMessage.innerHTML = `
                    <p>Erro ao conectar com o servidor. Por favor, tente novamente.</p>
                `;
                qrcodeContainer.appendChild(errorMessage);
                
                // Remover a mensagem após alguns segundos
                setTimeout(() => {
                    if (qrcodeContainer.contains(errorMessage)) {
                        qrcodeContainer.removeChild(errorMessage);
                    }
                }, 5000);
            }
        });
    }
    
    // Verificar se há um pagamento em andamento ao carregar a página
    const currentPayment = JSON.parse(localStorage.getItem('current_payment'));
    if (currentPayment && currentPayment.payment_id) {
        checkPaymentStatus(currentPayment.payment_id);
    }
    
    // Configurar botão de adicionar ao carrinho
    const addToCartBtn = document.getElementById('add-to-cart');
    addToCartBtn.addEventListener('click', function() {
        if (!serverSelect.value) {
            alert('Por favor, selecione um servidor.');
            return;
        }
        const quantity = parseInt(quantityInput.value);
        const characterName = document.getElementById('character-name').value;
        if (!characterName.trim()) {
            alert('Por favor, informe o nome do seu personagem.');
            return;
        }
        const price = quantity * gameData.pricePerUnit;
        
        // Adicionar ao carrinho (localStorage)
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        cart.push({
            game: game,
            gameName: gameData.name,
            server: serverSelect.value,
            character: characterName,
            quantity: quantity,
            price: price,
            image: gameData.image
        });
        
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Atualizar contador do carrinho
        updateCartCount();
        
        alert(`${quantity} ${gameData.currency} adicionados ao carrinho!`);
    });
    
    // Atualizar contador do carrinho
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = document.getElementById('cart-count');
        cartCount.textContent = cart.length;
        
        if (cart.length > 0) {
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    }
    
    // Inicializar contador do carrinho
    updateCartCount();
});