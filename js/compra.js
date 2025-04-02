document.addEventListener('DOMContentLoaded', function() {
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get('game');
    
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
    buyNowBtn.addEventListener('click', function() {
        if (!serverSelect.value) {
            alert('Por favor, selecione um servidor.');
            return;
        }
        
        const quantity = parseInt(quantityInput.value);
        const price = quantity * gameData.pricePerUnit;
        
        // Exibir o modal de pagamento
        const paymentModal = document.getElementById('payment-modal');
        document.getElementById('payment-amount').textContent = `R$ ${price.toFixed(2)}`;
        
        // Gerar um "QR Code" simulado (um placeholder)
        const qrcodeContainer = document.getElementById('qrcode-container');
        qrcodeContainer.innerHTML = `
            <div style="width: 200px; height: 200px; background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; border: 1px solid #ddd; border-radius: 4px;">
                <p>QR Code do PIX<br>CNPJ: 49.450.443/0001-73<br>Valor: R$ ${price.toFixed(2)}</p>
            </div>
        `;
        
        paymentModal.style.display = 'block';
        
        // Configurar botão de confirmar pagamento
        const confirmPaymentBtn = document.getElementById('confirm-payment');
        confirmPaymentBtn.addEventListener('click', function() {
            // Simular o envio de um email (em um cenário real, isso seria feito no backend)
            console.log(`Enviando e-mail para contato.mmomarket@gmail.com`);
            console.log(`Assunto: Compra - ${gameData.name}`);
            console.log(`Corpo: 
                Jogo: ${gameData.name}
                Servidor: ${serverSelect.value}
                Quantidade: ${quantity} ${gameData.currency}
                Valor: R$ ${price.toFixed(2)}
            `);
            
            // Fechar o modal de pagamento
            paymentModal.style.display = 'none';
            
            // Exibir o modal de confirmação
            const confirmationModal = document.getElementById('confirmation-modal');
            confirmationModal.style.display = 'block';
        });
    });
    
    // Configurar botão de adicionar ao carrinho
    const addToCartBtn = document.getElementById('add-to-cart');
    addToCartBtn.addEventListener('click', function() {
        if (!serverSelect.value) {
            alert('Por favor, selecione um servidor.');
            return;
        }
        
        const quantity = parseInt(quantityInput.value);
        const price = quantity * gameData.pricePerUnit;
        
        // Adicionar ao carrinho (localStorage)
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        cart.push({
            game: game,
            gameName: gameData.name,
            server: serverSelect.value,
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