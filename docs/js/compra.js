document.addEventListener('DOMContentLoaded', function() {
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get('game');
    
    // API URL com nome neutro para evitar bloqueio
    const APP_SERVICE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://mmomarket-backend.onrender.com/api';
    
    const BACKEND_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://mmomarket-backend.onrender.com';
    
    // Dados dos jogos (em um cenário real, esses dados viriam de uma API ou banco de dados)
    const games = {
        'cabal': {
            name: 'Cabal Alz',
            image: 'images/cabal.jpg',
            servers: [
                { name: 'BR - Mercurio', pricePerUnit: 0.0000000298 },
                { name: 'BR - Venus', pricePerUnit: 0.0000000278 }
            ],
            currency: 'Alz',
            increment: 100000000,
            increment2: 1000000000
        },
        'dofus': {
            name: 'Dofus Kamas',
            image: 'images/dofus.jpg',
            servers: [
                { name: 'Tal Kasha', pricePerUnit: 0.00000724},
                { name: 'Draconiros', pricePerUnit: 0.00000719},
                { name: 'Dakal', pricePerUnit: 0.00002641},
                { name: 'Kourial', pricePerUnit: 0.00002664},
                { name: 'Brial', pricePerUnit: 0.00001521},
                { name: 'Salar', pricePerUnit: 0.00001520},
                { name: 'Mikhal', pricePerUnit: 0.00002543},
                { name: 'Rafal', pricePerUnit: 0.00001521}
            ],
            currency: 'Kamas',
            increment: 10000000,
            increment2: 100000000
        },
        'habbo': {
            name: 'Habbo Moedas',
            image: 'images/habbo.jpg',
            servers: [
                { name: 'BR', pricePerUnit: 0.378 }
            ],
            currency: 'Moedas',
            increment: 50,
            increment2: 500
        },
        'albion': {
            name: 'Albion Pratas',
            image: 'images/albion.jpg',
            servers: [
                { name: 'Americas', pricePerUnit: 0.00000282},
                { name: 'Europa', pricePerUnit: 0.00000299},
                { name: 'Ásia', pricePerUnit: 0.00000327}
            ],
            currency: 'Pratas',
            increment: 20000000,
            increment2: 200000000
        },
        'ragnarok': {
            name: 'Ragnarok Zeny',
            image: 'images/ragnarok.jpg',
            servers: [
                { name: 'bRO Thor', pricePerUnit: 0.000000012},
                { name: 'bRO Valhalla', pricePerUnit: 0.000000013}
            ],
            currency: 'Zeny',
            increment: 100000000,
            increment2: 1000000000
        },
        'pristontale': {
            name: 'Priston Tale Ouro',
            image: 'images/pristontale.jpg',
            servers: [
                { name: 'Cronus', pricePerUnit: 0.0000006 },
                { name: 'Awell', pricePerUnit: 0.0000006 },
                { name: 'Valento', pricePerUnit: 0.0000006 },
                { name: 'Migal', pricePerUnit: 0.0000006 },
                { name: 'Midranda', pricePerUnit: 0.0000006 },
                { name: 'Idhas', pricePerUnit: 0.0000006 },
            ],
            currency: 'Ouro',
            increment: 2000000,
            increment2: 20000000
        },
        'throne': {
            name: 'T&L Lucent',
            image: 'images/throne.jpg',
            servers: [
                { name: 'WA - Moonstone', pricePerUnit: 0.0586},
                { name: 'WA - Invoker', pricePerUnit: 0.0586},
                { name: 'WA - Oblivion', pricePerUnit: 0.0580},
                { name: 'WA - Akidu', pricePerUnit: 0.0563},
                { name: 'EA - Carnage', pricePerUnit: 0.0610},
                { name: 'EA - Ivory', pricePerUnit: 0.0610},
                { name: 'EA - Snowburn', pricePerUnit: 0.0610},
                { name: 'EA - Stellarite', pricePerUnit: 0.0610},
                { name: 'EA - Adrenaline', pricePerUnit: 0.0610},
                { name: 'EA - Pippin', pricePerUnit: 0.0602},
                { name: 'SA - Starlight', pricePerUnit: 0.0694},
                { name: 'SA - Eldritch', pricePerUnit: 0.0694},
                { name: 'SA - Resistance', pricePerUnit: 0.0694},
                { name: 'SA - Chamir', pricePerUnit: 0.0677},
                { name: 'EU - Cascade', pricePerUnit: 0.0618},
                { name: 'EU - Emerald', pricePerUnit: 0.0627},
                { name: 'EU - Judgement', pricePerUnit: 0.0618},
                { name: 'EU - Destiny', pricePerUnit: 0.0626},
                { name: 'EU - Rebellion', pricePerUnit: 0.0627},
                { name: 'EU - Fortune', pricePerUnit: 0.0618},
                { name: 'EU - Talon', pricePerUnit: 0.0623},
                { name: 'EU - Arcane', pricePerUnit: 0.0623},
                { name: 'EU - Zephyr', pricePerUnit: 0.0627},
                { name: 'EU - Conviction', pricePerUnit: 0.0618},
                { name: 'EU - Obsidian', pricePerUnit: 0.0580},
                { name: 'EU - Paola', pricePerUnit: 0.0627}
            ],
            currency: 'Lucent',
            increment: 1000,
            increment2: 10000
        },
        'muonline': {
            name: 'Mu Online Bless',
            image: 'images/muonline.jpg',
            servers: [
                { name: 'Hellheim', pricePerUnit: 0.66 },
                { name: 'Alfheim', pricePerUnit: 0.66 },
                { name: 'Midgard', pricePerUnit: 0.66 },
                { name: 'Arcadia', pricePerUnit: 0.66 },
                { name: 'Fresei', pricePerUnit: 0.66 },
                { name: 'Nidavellir', pricePerUnit: 0.66 },
                { name: 'Ydalir', pricePerUnit: 0.66 }
            ],
            currency: 'Bless',
            increment: 50,
            increment2: 500
        }
    };
    
    // Se não houver jogo especificado, redirecionar para a lista de jogos
    if (!game || !games[game]) {
        window.location.href = 'listajogos.html';
        return;
    }
    
    // Configurar a página de acordo com o jogo
    const gameData = games[game];
    document.getElementById('game-title').textContent = gameData.name;
    document.getElementById('game-img').src = gameData.image;
    document.getElementById('game-img').alt = gameData.name;
    document.title = `MMOMarket - ${gameData.name}`;
    
    // Configurar o seletor de servidor
    let currentPricePerUnit = 0;

    const serverSelect = document.getElementById('server');
    gameData.servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.name;
        option.textContent = server.name;
        // Armazenar o preço como atributo de dados
        option.dataset.price = server.pricePerUnit;
        serverSelect.appendChild(option);
    });
    
    // Definir o preço inicial baseado no primeiro servidor
    if (gameData.servers.length > 0) {
        currentPricePerUnit = gameData.servers[0].pricePerUnit;
    }
    
    // Adicionar listener para mudança de servidor
    serverSelect.addEventListener('change', function() {
        // Encontrar o servidor selecionado
        const selectedServer = this.options[this.selectedIndex];
        // Atualizar o preço por unidade
        currentPricePerUnit = parseFloat(selectedServer.dataset.price);
        // Recalcular o preço
        updatePrice();
    });
    
    // Configurar seletor de quantidade
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decrease');
    const decrease2Btn = document.getElementById('decrease2');
    const increaseBtn = document.getElementById('increase');
    const increase2Btn = document.getElementById('increase2');
    const quantityDisplay = document.getElementById('quantityDisplay');
    
    // Variáveis para cupom e preços
    let appliedCoupon = null;
    let currentPrice = 0;
    let currentDiscountedPrice = 0;
    
    // Definir a quantidade inicial e mínima
    quantityInput.value = gameData.increment;
    quantityInput.min = gameData.increment;
    quantityDisplay.value = Number(quantityInput.value).toLocaleString();
    
    // Calcular preço inicial
    updatePrice();
    
    // Adicionar event listeners para os botões de quantidade
    decreaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > gameData.increment) {
            quantityInput.value = currentValue - gameData.increment;
            quantityDisplay.value = Number(quantityInput.value).toLocaleString();
            updatePrice();
        }
    });

    decrease2Btn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > gameData.increment2) {
            quantityInput.value = currentValue - gameData.increment2;
            quantityDisplay.value = Number(quantityInput.value).toLocaleString();
            updatePrice();
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + gameData.increment;
        quantityDisplay.value = Number(quantityInput.value).toLocaleString();
        updatePrice();
    });

    increase2Btn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + gameData.increment2;
        quantityDisplay.value = Number(quantityInput.value).toLocaleString();
        updatePrice();
    });
    
    // Função para atualizar o preço
    function updatePrice() {
        const quantity = parseInt(quantityInput.value);
        currentPrice = quantity * currentPricePerUnit;
        
        // Se houver cupom aplicado, recalcular preço com desconto
        if (appliedCoupon) {
            const discountAmount = (currentPrice * appliedCoupon.discount) / 100;
            currentDiscountedPrice = currentPrice - discountAmount;
            
            // Mostrar preço original e com desconto
            document.getElementById('price').innerHTML = `
                <span class="original-price">R$ ${currentPrice.toFixed(2)}</span>
                <div class="discount-applied">
                    <span>R$ ${currentDiscountedPrice.toFixed(2)}</span>
                    <span>-${appliedCoupon.discount}%</span>
                </div>
            `;
        } else {
            currentDiscountedPrice = currentPrice;
            document.getElementById('price').textContent = `R$ ${currentPrice.toFixed(2)}`;
        }
        
        console.log(`updatePrice - Original: ${currentPrice}, Com desconto: ${currentDiscountedPrice}, PricePerUnit: ${currentPricePerUnit}`);
    }
    
    // Função para aplicar cupom
    const applyCouponBtn = document.getElementById('apply-coupon');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', async function() {
            const couponInput = document.getElementById('coupon-code');
            const couponMessage = document.getElementById('coupon-message');
            
            if (!couponInput || !couponInput.value.trim()) {
                if (couponMessage) {
                    couponMessage.textContent = 'Por favor, insira um código de cupom.';
                    couponMessage.className = 'coupon-message error';
                }
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
                    
                    if (couponMessage) {
                        couponMessage.textContent = `Cupom aplicado: ${appliedCoupon.discount}% de desconto!`;
                        couponMessage.className = 'coupon-message success';
                    }
                    
                    // Desabilitar campo e botão
                    couponInput.disabled = true;
                    applyCouponBtn.disabled = true;
                    
                    // Atualizar preço com desconto
                    updatePrice();
                } else {
                    // Cupom inválido
                    if (couponMessage) {
                        couponMessage.textContent = 'Cupom inválido ou já utilizado.';
                        couponMessage.className = 'coupon-message error';
                    }
                    
                    appliedCoupon = null;
                }
            } catch (error) {
                console.error('Erro ao validar cupom:', error);
                if (couponMessage) {
                    couponMessage.textContent = 'Erro ao validar cupom. Tente novamente.';
                    couponMessage.className = 'coupon-message error';
                }
                
                appliedCoupon = null;
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
    
    // Função para obter o código de referência
    function getReferralFromStorage() {
        return localStorage.getItem('refCode') || null;
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
        
        // Primeiro carregamos os recursos auxiliares
        try {
            await loadProcessResources();
        } catch (error) {
            console.error('Erro ao carregar recursos:', error);
            alert('Erro ao preparar o serviço. Por favor, desative extensões de bloqueio ou tente em outro navegador.');
            return;
        }
        
        // Exibir o modal de processamento
        const processModal = document.getElementById('pm-dialog');
        if (processModal) {
            const paymentAmount = document.getElementById('payment-amount');
            if (paymentAmount) {
                paymentAmount.textContent = `R$ ${currentDiscountedPrice.toFixed(2)}`;
            }
            
            // Mostrar loader
            const qrcodeContainer = document.getElementById('qrcode-container');
            if (qrcodeContainer) {
                qrcodeContainer.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Processando...</p>
                    </div>
                `;
                
                processModal.style.display = 'block';
            }
        }
        
        try {
            // Dados para enviar ao backend
            const processData = {
                items: [{
                    game: game,
                    gameName: gameData.name,
                    server: serverSelect.value,
                    character: characterName,
                    quantity: quantity,
                    price: currentPrice // Valor original sem desconto
                }],
                total: currentDiscountedPrice, // Valor com desconto aplicado, se houver
                originalTotal: currentPrice, // Valor original sem desconto
                customerEmail: 'cliente@mmomarket.com.br',
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                referralCode: getReferralFromStorage()
            };
            
            console.log("Dados a serem enviados para pagamento:", processData);
            
            // Alternativa direta ao QR Code para evitar problemas de Adblock
            const qrcodeContainer = document.getElementById('qrcode-container');
            if (!qrcodeContainer) {
                throw new Error('Container não encontrado');
            }
            
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
                
                // Mostrar QR Code diretamente sem iframe
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
                        navigator.clipboard.writeText(pixCode).then(function() {
                            copyButton.textContent = "Copiado!";
                            setTimeout(() => {
                                copyButton.textContent = "Copiar";
                            }, 2000);
                        }).catch(function(err) {
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
                                    <li>Digite o valor: R$ ${currentDiscountedPrice.toFixed(2)}</li>
                                    <li>Na descrição/mensagem, informe: Order ${orderId}</li>
                                    <li>Confirme o pagamento</li>
                                    <li>Clique no botão "Verificar" após o pagamento</li>
                                </ol>
                                
                                <button class="secondary-btn" id="verify-payment-btn">Verificar</button>
                                <button class="secondary-btn" id="back-to-qr-btn" style="margin-top: 10px;">Voltar para QR Code</button>
                            </div>
                        `;
                        
                        // Adicionar funcionalidade aos botões
                        document.getElementById('copy-key-btn').addEventListener('click', function() {
                            navigator.clipboard.writeText('contato.mmomarket@gmail.com')
                                .then(() => {
                                    this.textContent = 'Copiado!';
                                    setTimeout(() => {
                                        this.textContent = 'Copiar Chave';
                                    }, 2000);
                                });
                        });
                        
                        document.getElementById('verify-payment-btn').addEventListener('click', async function() {
                            this.textContent = 'Verificando...';
                            this.disabled = true;
                            
                            try {
                                const result = await window.serviceHelper.checkProcessStatus(processId);
                                
                                if (result.status === 'success' && result.data.status === 'approved') {
                                    // Processo aprovado
                                    const processModal = document.getElementById('pm-dialog');
                                    if (processModal) {
                                        processModal.style.display = 'none';
                                    }
                                    
                                    const confirmationModal = document.getElementById('confirmation-modal');
                                    if (confirmationModal) {
                                        confirmationModal.style.display = 'block';
                                    }
                                    
                                    localStorage.removeItem('current_process');
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
                        
                        document.getElementById('back-to-qr-btn').addEventListener('click', function() {
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
                            document.getElementById('copy-pix-code').addEventListener('click', function() {
                                navigator.clipboard.writeText(pixData.qr_code).then(() => {
                                    this.textContent = "Copiado!";
                                    setTimeout(() => {
                                        this.textContent = "Copiar";
                                    }, 2000);
                                });
                            });
                            
                            document.getElementById('show-alt-options').addEventListener('click', function() {
                                altOptionsButton.click();
                            });
                        });
                    });
                }
                
                // Iniciar verificação automática
                startAutoVerification(processId);
            } else {
                throw new Error('Falha ao processar pagamento');
            }
        } catch (error) {
            console.error('Erro ao processar:', error);
            const qrcodeContainer = document.getElementById('qrcode-container');
            if (qrcodeContainer) {
                qrcodeContainer.innerHTML = `
                    <div class="process-error">
                        <p>Erro ao conectar com o servidor. Desative seu adblock e tente novamente.</p>
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
                    });
                }
            }
        }
    });
    
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
                        
                        // Fechar o modal de processamento
                        if (processModal) {
                            processModal.style.display = 'none';
                        }
                        
                        // Exibir o modal de confirmação
                        const confirmationModal = document.getElementById('confirmation-modal');
                        if (confirmationModal) {
                            confirmationModal.style.display = 'block';
                        }
                        
                        // Limpar dados do processo atual
                        localStorage.removeItem('current_process');
                    }
                }
            } catch (error) {
                console.error('Erro na verificação automática:', error);
            }
        }, 5000); // Verificar a cada 5 segundos
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
    
    // Configurar botão de adicionar ao carrinho
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
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
            
            // Adicionar ao carrinho (localStorage)
            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            
            cart.push({
                game: game,
                gameName: gameData.name,
                server: serverSelect.value,
                character: characterName,
                quantity: quantity,
                price: currentPrice,
                image: gameData.image
            });
            
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Atualizar contador do carrinho
            updateCartCount();
            
            alert(`${quantity} ${gameData.currency} adicionados ao carrinho!`);
        });
    }
    
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
});