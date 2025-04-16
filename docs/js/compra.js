document.addEventListener('DOMContentLoaded', function() {
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get('game');
    
    // API URL com nome neutro para evitar bloqueio
    const APP_SERVICE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://mmomarket-backend.onrender.com';
    //const BACKEND_URL = 'http://localhost:3000'; // URL base do backend
    const BACKEND_URL = 'https://mmomarket-backend.onrender.com'
    
    // Dados dos jogos (em um cenário real, esses dados viriam de uma API ou banco de dados)
    const games = {
        'cabal': {
            name: 'Cabal Alz',
            image: 'images/cabal.jpg',
            servers: ['BR - Mercurio', 'BR - Venus', 'EU - Mercury', 'EU - Venus'],
            currency: 'Alz',
            pricePerUnit: 0.000000072,
            increment: 100000000
        },
        'dofus': {
            name: 'Dofus Kamas',
            image: 'images/dofus.jpg',
            servers: ['Tal Kasha' , 'Draconiros' , 'Dakal' , 'Kourial' , 'Brial' , 'Salar' , 'Mikhal' , 'Rafal'],
            currency: 'Kamas',
            pricePerUnit: 0.000022,
            increment: 10000000
        },
        'habbo': {
            name: 'Habbo Moedas',
            image: 'images/habbo.jpg',
            servers: ['BR'],
            currency: 'Moedas',
            pricePerUnit: 0.378,
            increment: 50
        },
        'albion': {
            name: 'Albion Pratas',
            image: 'images/albion.jpg',
            servers: ['Americas', 'Europa', 'Ásia'],
            currency: 'Pratas',
            pricePerUnit: 0.0000028,
            increment: 20000000
        },
        'ragnarok': {
            name: 'Ragnarok Zeny',
            image: 'images/ragnarok.jpg',
            servers: ['bRO Thor', 'bRO Valhalla'],
            currency: 'Zeny',
            pricePerUnit: 0.00000026,
            increment: 100000000
        },
        'secondlife': {
            name: 'Second Life Lindens',
            image: 'images/secondlife.jpg',
            servers: ['Main Grid'],
            currency: 'Lindens',
            pricePerUnit: 0.04,
            increment: 1000
        },
        'throne': {
            name: 'T&L Lucent',
            image: 'images/throne.jpg',
            servers: ['WA - Moonstone' , 'WA - Invoker' , 'WA - Oblivion' , 'WA - Akidu' , 'EA - Carnage' , 'EA - Ivory' , 'EA - Snowburn' , 'EA - Stellarite' , 'EA - Adrenaline' , 'EA - Pippin' , 'SA - Starlight' , 'SA - Eldritch' , 'SA - Resistance' , 'SA - Chamir' , 'EU - Cascade' , 'EU - Emerald' , 'EU - Judgement' , 'EU - Destiny' , 'EU - Rebellion' , 'EU - Fortune' , 'EU - Talon' , 'EU - Arcane' , 'EU - Zephyr' , 'EU - Conviction' ,' EU - Obsidian' ,' EU - Paola'],
            currency: 'Lucent',
            pricePerUnit: 0.06000,
            increment: 1000
        },
        'muonline': {
            name: 'Mu Online Bless',
            image: 'images/muonline.jpg',
            servers: ['Hellheim' , 'Alfheim' , 'Midgard' , 'Arcadia' , 'Fresei' , 'Nidavellir' , 'Ydalir'],
            currency: 'Bless',
            pricePerUnit: 0.58,
            increment: 50
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
                paymentAmount.textContent = `R$ ${price.toFixed(2)}`;
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
                    price: price
                }],
                total: price,
                customerEmail: 'cliente@mmomarket.com.br'
            };
            
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
                                    <li>Digite o valor: R$ ${price.toFixed(2)}</li>
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