/**
 * Gerenciador de carrinho e checkout para o MMOMarket
 * Versão otimizada para evitar bloqueios de AdBlock
 */
document.addEventListener('DOMContentLoaded', function() {
    // API URL com nome neutro para evitar bloqueio
    const APP_SERVICE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://mmomarket-backend.onrender.com/api';
    
    // Variáveis para armazenar os valores do carrinho
    let cartTotalValue = 0;
    let cartDiscountedValue = 0;
    let appliedCoupon = null;
    
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
        
        // Verificar se todos os elementos necessários existem
        if (!cartItemsContainer || !cartEmptyMessage || !cartSummary || !cartTotal) {
            console.error('Erro: Elementos do carrinho não encontrados');
            return;
        }
        
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
                    <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.gameName}">
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
            
            // Armazenar o total para uso posterior
            cartTotalValue = total;
            cartDiscountedValue = total;
            
            // Atualizar total
            updateTotalWithDiscount();
            
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
            
            // Função para atualizar o total com desconto
            function updateTotalWithDiscount() {
                if (appliedCoupon) {
                    const discountAmount = (cartTotalValue * appliedCoupon.discount) / 100;
                    cartDiscountedValue = cartTotalValue - discountAmount;
                    
                    cartTotal.innerHTML = `
                        <span class="original-price">R$ ${cartTotalValue.toFixed(2)}</span>
                        <div class="discount-applied">
                            <span>R$ ${cartDiscountedValue.toFixed(2)}</span>
                            <span>-${appliedCoupon.discount}%</span>
                        </div>
                    `;
                } else {
                    cartDiscountedValue = cartTotalValue;
                    cartTotal.textContent = `R$ ${cartTotalValue.toFixed(2)}`;
                }
                
                console.log(`updateTotalWithDiscount - Original: ${cartTotalValue}, Com desconto: ${cartDiscountedValue}`);
            }
            
            // Configurar botão de aplicar cupom
            const applyCouponBtn = document.getElementById('apply-coupon');
            const couponInput = document.getElementById('coupon-code');
            const couponMessage = document.getElementById('coupon-message');
            
            if (applyCouponBtn && couponInput && couponMessage) {
                applyCouponBtn.addEventListener('click', async function() {
                    if (!couponInput.value.trim()) {
                        couponMessage.textContent = 'Por favor, insira um código de cupom.';
                        couponMessage.className = 'coupon-message error';
                        return;
                    }
                    
                    const couponCode = couponInput.value.trim().toUpperCase();
                    
                    try {
                        const baseUrl = window.location.hostname === 'localhost' 
                            ? 'http://localhost:3000' 
                            : 'https://mmomarket-backend.onrender.com';
                        
                        const response = await fetch(`${baseUrl}/api/coupons/validate/${couponCode}`);
                        const result = await response.json();
                        
                        if (result.status === 'success') {
                            // Cupom válido
                            appliedCoupon = result.data;
                            
                            couponMessage.textContent = `Cupom aplicado: ${appliedCoupon.discount}% de desconto!`;
                            couponMessage.className = 'coupon-message success';
                            
                            // Desabilitar campo e botão
                            couponInput.disabled = true;
                            applyCouponBtn.disabled = true;
                            
                            // Atualizar total com desconto
                            updateTotalWithDiscount();
                        } else {
                            // Cupom inválido
                            couponMessage.textContent = 'Cupom inválido ou já utilizado.';
                            couponMessage.className = 'coupon-message error';
                            
                            appliedCoupon = null;
                            updateTotalWithDiscount();
                        }
                    } catch (error) {
                        console.error('Erro ao validar cupom:', error);
                        couponMessage.textContent = 'Erro ao validar cupom. Tente novamente.';
                        couponMessage.className = 'coupon-message error';
                        
                        appliedCoupon = null;
                        updateTotalWithDiscount();
                    }
                });
            }
            
            // Função para carregar recursos de processamento sob demanda
            function loadProcessResources() {
                return new Promise((resolve, reject) => {
                    if (window.serviceHelper) {
                        resolve();
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.src = 'js/service-helper.js'; 
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Falha ao carregar recursos'));
                    document.head.appendChild(script);
                });
            }
            
            // Função para obter código de referência
            function getReferralFromStorage() {
                return localStorage.getItem('refCode') || null;
            }
            
            // Configurar botão de checkout
            const checkoutBtn = document.getElementById('checkout');
            if (!checkoutBtn) {
                console.error('Erro: Botão de checkout não encontrado');
                return;
            }
            
            checkoutBtn.addEventListener('click', async function() {
                // Primeiro carregamos os recursos auxiliares
                try {
                    await loadProcessResources();
                } catch (error) {
                    console.error('Erro ao carregar recursos:', error);
                    alert('Erro ao preparar o serviço. Por favor, desative extensões de bloqueio ou tente em outro navegador.');
                    return;
                }
                
                // Obter itens do carrinho
                if (cart.length === 0) return;
                
                // Exibir o modal de processamento
                const processModal = document.getElementById('pm-dialog');
                if (!processModal) {
                    console.error('Erro: Modal de processamento não encontrado');
                    return;
                }
                
                const paymentAmountElement = document.getElementById('payment-amount');
                if (paymentAmountElement) {
                    paymentAmountElement.textContent = `R$ ${cartDiscountedValue.toFixed(2)}`;
                }
                
                // Mostrar loader
                const qrcodeContainer = document.getElementById('qrcode-container');
                if (!qrcodeContainer) {
                    console.error('Erro: Container de QR code não encontrado');
                    return;
                }
                
                qrcodeContainer.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Processando...</p>
                    </div>
                `;
                
                processModal.style.display = 'block';
                
                try {
                    // Dados para enviar ao backend
                    const processData = {
                        items: cart,
                        total: cartDiscountedValue, // Valor com desconto
                        originalTotal: cartTotalValue, // Valor original sem desconto
                        customerEmail: 'cliente@mmomarket.com.br',
                        couponCode: appliedCoupon ? appliedCoupon.code : null,
                        referralCode: getReferralFromStorage()
                    };
                    
                    console.log("Dados a serem enviados para pagamento:", processData);
                    
                    // Usar o helper para enviar a requisição
                    const result = await window.serviceHelper.prepareProcess(processData);
                    
                    if (result.status === 'success') {
                        const pixData = result.data.pix_data;
                        const orderId = result.data.order_id;
                        const processId = result.data.payment_id;
                        
                        // Salvar dados na localStorage para verificação posterior
                        localStorage.setItem('current_process', JSON.stringify({
                            order_id: orderId,
                            process_id: processId
                        }));
                        
                        // Mostrar QR Code diretamente, sem iframe
                        qrcodeContainer.innerHTML = `
                            <img src="data:image/png;base64,${pixData.qr_code_base64}" alt="QR Code">
                            <p class="pix-code-text">Código copia e cola:</p>
                            <div class="pix-code-container">
                                <code class="pix-code">${pixData.qr_code}</code>
                                <button class="copy-button" id="copy-pix-code">Copiar</button>
                            </div>
                            <button class="secondary-btn service-btn mt-3" id="show-alt-options">Problemas para visualizar?</button>
                        `;
                        
                        // Adicionar funcionalidade para copiar código
                        const copyButton = document.getElementById('copy-pix-code');
                        if (copyButton) {
                            copyButton.addEventListener('click', function() {
                                const pixCode = pixData.qr_code;
                                navigator.clipboard.writeText(pixCode)
                                    .then(() => {
                                        copyButton.textContent = "Copiado!";
                                        setTimeout(() => {
                                            copyButton.textContent = "Copiar";
                                        }, 2000);
                                    })
                                    .catch(err => {
                                        console.error('Erro ao copiar:', err);
                                        alert('Não foi possível copiar automaticamente. Por favor, copie manualmente.');
                                    });
                            });
                        }
                        
                        // Adicionar opções alternativas
                        const altOptionsButton = document.getElementById('show-alt-options');
                        if (altOptionsButton) {
                            altOptionsButton.addEventListener('click', function() {
                                qrcodeContainer.innerHTML = `
                                    <div class="alternative-options">
                                        <h3>Opções de pagamento alternativas</h3>
                                        <p>Use uma das opções abaixo:</p>
                                        
                                        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">
                                            <p><strong>Chave PIX:</strong> contato.mmomarket@gmail.com</p>
                                            <button class="primary-btn" id="copy-key-btn">Copiar Chave</button>
                                        </div>
                                        
                                        <p><strong>Instruções:</strong></p>
                                        <ol style="text-align: left; margin-bottom: 15px;">
                                            <li>Abra o aplicativo do seu banco</li>
                                            <li>Escolha a opção PIX</li>
                                            <li>Cole a chave PIX acima</li>
                                            <li>Digite o valor: R$ ${cartDiscountedValue.toFixed(2)}</li>
                                            <li>Na descrição/mensagem, informe: Order ${orderId}</li>
                                            <li>Confirme o pagamento</li>
                                            <li>Clique no botão "Verificar" após o pagamento</li>
                                        </ol>
                                        
                                        <button class="secondary-btn" id="verify-payment-btn">Verificar</button>
                                        <button class="secondary-btn" id="back-to-qr-btn" style="margin-top: 10px;">Voltar para QR Code</button>
                                    </div>
                                `;
                                
                                // Adicionar funcionalidade aos botões
                                const copyKeyBtn = document.getElementById('copy-key-btn');
                                if (copyKeyBtn) {
                                    copyKeyBtn.addEventListener('click', function() {
                                        navigator.clipboard.writeText('contato.mmomarket@gmail.com')
                                            .then(() => {
                                                this.textContent = 'Copiado!';
                                                setTimeout(() => {
                                                    this.textContent = 'Copiar Chave';
                                                }, 2000);
                                            });
                                    });
                                }
                                
                                const verifyPaymentBtn = document.getElementById('verify-payment-btn');
                                if (verifyPaymentBtn) {
                                    verifyPaymentBtn.addEventListener('click', async function() {
                                        this.textContent = 'Verificando...';
                                        this.disabled = true;
                                        
                                        try {
                                            const result = await window.serviceHelper.checkProcessStatus(processId);
                                            
                                            if (result.status === 'success' && result.data.status === 'approved') {
                                                // Processo aprovado, limpar carrinho e mostrar confirmação
                                                completeCheckout();
                                            } else {
                                                this.textContent = 'Verificar';
                                                this.disabled = false;
                                                
                                                const statusMsg = document.createElement('p');
                                                statusMsg.textContent = 'Pagamento ainda não confirmado. Por favor, aguarde alguns instantes.';
                                                statusMsg.style.color = '#ff4757';
                                                qrcodeContainer.appendChild(statusMsg);
                                                
                                                setTimeout(() => {
                                                    if (qrcodeContainer.contains(statusMsg)) {
                                                        qrcodeContainer.removeChild(statusMsg);
                                                    }
                                                }, 5000);
                                            }
                                        } catch (error) {
                                            console.error('Erro ao verificar:', error);
                                            this.textContent = 'Verificar';
                                            this.disabled = false;
                                        }
                                    });
                                }
                                
                                const backToQrBtn = document.getElementById('back-to-qr-btn');
                                if (backToQrBtn) {
                                    backToQrBtn.addEventListener('click', function() {
                                        // Voltar para o QR Code
                                        qrcodeContainer.innerHTML = `
                                            <img src="data:image/png;base64,${pixData.qr_code_base64}" alt="QR Code">
                                            <p class="pix-code-text">Código copia e cola:</p>
                                            <div class="pix-code-container">
                                                <code class="pix-code">${pixData.qr_code}</code>
                                                <button class="copy-button" id="copy-pix-code">Copiar</button>
                                            </div>
                                            <button class="secondary-btn service-btn mt-3" id="show-alt-options">Problemas para visualizar?</button>
                                        `;
                                        
                                        // Readicionar event listeners
                                        const newCopyButton = document.getElementById('copy-pix-code');
                                        if (newCopyButton) {
                                            newCopyButton.addEventListener('click', function() {
                                                navigator.clipboard.writeText(pixData.qr_code)
                                                    .then(() => {
                                                        this.textContent = "Copiado!";
                                                        setTimeout(() => {
                                                            this.textContent = "Copiar";
                                                        }, 2000);
                                                    });
                                            });
                                        }
                                        
                                        const newAltOptionsButton = document.getElementById('show-alt-options');
                                        if (newAltOptionsButton) {
                                            newAltOptionsButton.addEventListener('click', function() {
                                                altOptionsButton.click();
                                            });
                                        }
                                    });
                                }
                            });
                        }
                        
                        // Iniciar verificação automática
                        startAutoVerification(processId);
                    } else {
                        throw new Error('Falha ao processar pagamento');
                    }
                } catch (error) {
                    console.error('Erro ao processar:', error);
                    qrcodeContainer.innerHTML = `
                        <div class="process-error">
                            <p>Erro ao conectar com o servidor. Desative seu adblock e tente novamente.</p>
                            <button id="try-again" class="primary-btn">Tentar Novamente</button>
                        </div>
                    `;
                    
                    const tryAgainBtn = document.getElementById('try-again');
                    if (tryAgainBtn) {
                        tryAgainBtn.addEventListener('click', function() {
                            if (processModal) {
                                processModal.style.display = 'none';
                            }
                        });
                    }
                }
            });
            
            // Função para concluir checkout quando o pagamento for aprovado
            function completeCheckout() {
                // Fechar o modal de processamento
                const processModal = document.getElementById('pm-dialog');
                if (processModal) {
                    processModal.style.display = 'none';
                }
                
                // Exibir o modal de confirmação
                const confirmationModal = document.getElementById('confirmation-modal');
                if (confirmationModal) {
                    confirmationModal.style.display = 'block';
                }
                
                // Limpar o carrinho
                localStorage.removeItem('cart');
                
                // Limpar dados do processo atual
                localStorage.removeItem('current_process');
                
                // Atualizar contador do carrinho
                updateCartCount();
                
                // Redirecionar após alguns segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 5000);
            }
            
            // Função para iniciar verificação automática
            function startAutoVerification(processId) {
                const interval = setInterval(async function() {
                    try {
                        // Verificar se o modal de processamento ainda está aberto
                        const processModal = document.getElementById('pm-dialog');
                        if (!processModal || processModal.style.display === 'none') {
                            clearInterval(interval);
                            return;
                        }
                        
                        const result = await window.serviceHelper.checkProcessStatus(processId);
                        
                        if (result.status === 'success') {
                            const processStatus = result.data.status;
                            
                            // Se o processo foi aprovado
                            if (processStatus === 'approved') {
                                clearInterval(interval);
                                completeCheckout();
                            } 
                            // Se o processo falhou
                            else if (['rejected', 'cancelled', 'refunded'].includes(processStatus)) {
                                clearInterval(interval);
                                
                                const qrcodeContainer = document.getElementById('qrcode-container');
                                if (qrcodeContainer) {
                                    qrcodeContainer.innerHTML = `
                                        <div class="process-error">
                                            <p>Processo ${processStatus === 'rejected' ? 'rejeitado' : 'cancelado'}. Por favor, tente novamente.</p>
                                            <button id="try-again" class="primary-btn">Tentar Novamente</button>
                                        </div>
                                    `;
                                    
                                    const tryAgainBtn = document.getElementById('try-again');
                                    if (tryAgainBtn) {
                                        tryAgainBtn.addEventListener('click', function() {
                                            const processModal = document.getElementById('pm-dialog');
                                            if (processModal) {
                                                processModal.style.display = 'none';
                                            }
                                            localStorage.removeItem('current_process');
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Erro na verificação automática:', error);
                    }
                }, 5000); // Verificar a cada 5 segundos
                
                // Configurar botão de confirmar para verificação manual
                const confirmBtn = document.getElementById('confirm-payment');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async function() {
                        const qrcodeContainer = document.getElementById('qrcode-container');
                        if (!qrcodeContainer) return;
                        
                        // Mostrar mensagem de verificação
                        const loadingMessage = document.createElement('div');
                        loadingMessage.className = 'process-verification';
                        loadingMessage.innerHTML = `
                            <div class="spinner"></div>
                            <p>Verificando pagamento...</p>
                        `;
                        qrcodeContainer.appendChild(loadingMessage);
                        
                        try {
                            const result = await window.serviceHelper.checkProcessStatus(processId);
                            
                            // Remover mensagem de verificação
                            if (qrcodeContainer.contains(loadingMessage)) {
                                qrcodeContainer.removeChild(loadingMessage);
                            }
                            
                            if (result.status === 'success') {
                                const processStatus = result.data.status;
                                
                                if (processStatus === 'approved') {
                                    clearInterval(interval);
                                    completeCheckout();
                                } else {
                                    const verificationMessage = document.createElement('div');
                                    verificationMessage.className = 'process-notification';
                                    verificationMessage.innerHTML = `
                                        <p>Processo ainda não confirmado. Por favor, aguarde ou verifique se você completou o pagamento.</p>
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
                                const errorMessage = document.createElement('div');
                                errorMessage.className = 'process-notification error';
                                errorMessage.innerHTML = `
                                    <p>Erro ao verificar. Por favor, tente novamente.</p>
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
                            console.error('Erro ao verificar status do processo:', error);
                            
                            // Remover mensagem de verificação
                            if (qrcodeContainer.contains(loadingMessage)) {
                                qrcodeContainer.removeChild(loadingMessage);
                            }
                            
                            const errorMessage = document.createElement('div');
                            errorMessage.className = 'process-notification error';
                            errorMessage.innerHTML = `
                                <p>Erro ao conectar com o servidor. Desative seu adblock e tente novamente.</p>
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
            }
            
            // Verificar se há um processo em andamento ao carregar a página
            const currentProcess = JSON.parse(localStorage.getItem('current_process'));
            if (currentProcess && currentProcess.process_id) {
                loadProcessResources().then(() => {
                    startAutoVerification(currentProcess.process_id);
                }).catch(error => {
                    console.error('Erro ao carregar recursos para verificação:', error);
                });
            }
        }
    }
});