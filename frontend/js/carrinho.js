document.addEventListener('DOMContentLoaded', function() {
    // API URL
    const API_URL = 'http://localhost:3000/api';
    
    // Atualizar contador do carrinho
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = document.getElementById('cart-count');
        
        if (cartCount) {
            cartCount.textContent = cart.length;
            
            if (cart.length > 0) {
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }
    }
    
    // Inicializar contador do carrinho
    updateCartCount();
    
    // Se estamos na página do carrinho, carregar os itens
    if (window.location.pathname.includes('carrinho.html')) {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartEmptyMessage = document.getElementById('cart-empty');
        const cartSummary = document.getElementById('cart-summary');
        const cartTotal = document.getElementById('cart-total');
        
        // Obter itens do carrinho
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            // Carrinho vazio
            cartEmptyMessage.classList.remove('hidden');
            cartSummary.classList.add('hidden');
        } else {
            // Carrinho com itens
            cartEmptyMessage.classList.add('hidden');
            cartSummary.classList.remove('hidden');
            
            // Limpar container
            cartItemsContainer.innerHTML = '';
            
            // Calcular total
            let total = 0;
            
            // Exibir itens
            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <img src="${item.image}" alt="${item.gameName}">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.gameName}</div>
                        <div class="cart-item-server">Servidor: ${item.server}</div>
                        <div class="cart-item-quantity">Quantidade: ${item.quantity}</div>
                        <div class="cart-item-character">Personagem: ${item.character}</div>
                    </div>
                    <div class="cart-item-price">R$ ${item.price.toFixed(2)}</div>
                    <button class="cart-item-remove" data-index="${index}">×</button>
                `;
                
                cartItemsContainer.appendChild(cartItem);
                total += item.price;
            });
            
            // Atualizar total
            cartTotal.textContent = `R$ ${total.toFixed(2)}`;
            
            // Adicionar event listeners para remover itens
            const removeButtons = document.querySelectorAll('.cart-item-remove');
            removeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const index = parseInt(this.dataset.index);
                    cart.splice(index, 1);
                    localStorage.setItem('cart', JSON.stringify(cart));
                    
                    // Recarregar a página para atualizar
                    window.location.reload();
                });
            });
            
            // Configurar botão de checkout
            const checkoutBtn = document.getElementById('checkout');
            checkoutBtn.addEventListener('click', async function() {
                // Obter itens do carrinho
                if (cart.length === 0) return;
                
                // Calcular total
                const total = cart.reduce((sum, item) => sum + item.price, 0);
                
                // Exibir o modal de pagamento
                const paymentModal = document.getElementById('payment-modal');
                document.getElementById('payment-amount').textContent = `R$ ${total.toFixed(2)}`;
                
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
                        items: cart,
                        total: total,
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
        } // Fechamento do else para carrinho com itens
        
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
                            
                            // Limpar o carrinho
                            localStorage.removeItem('cart');
                            
                            // Limpar dados do pagamento atual
                            localStorage.removeItem('current_payment');
                            
                            // Atualizar contador do carrinho
                            updateCartCount();
                            
                            // Redirecionar após alguns segundos
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 5000);
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
                            
                            // Limpar o carrinho
                            localStorage.removeItem('cart');
                            
                            // Limpar dados do pagamento atual
                            localStorage.removeItem('current_payment');
                            
                            // Atualizar contador do carrinho
                            updateCartCount();
                            
                            // Redirecionar após alguns segundos
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 5000);
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
        const currentPayment = JSON.parse(localStorage.getItem('current_payment') || 'null');
        if (currentPayment && currentPayment.payment_id) {
            checkPaymentStatus(currentPayment.payment_id);
        }
    }
});