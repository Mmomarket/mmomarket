document.addEventListener('DOMContentLoaded', function() {
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
            checkoutBtn.addEventListener('click', function() {
                // Exibir o modal de pagamento
                const paymentModal = document.getElementById('payment-modal');
                document.getElementById('payment-amount').textContent = `R$ ${total.toFixed(2)}`;
                
                // Gerar um "QR Code" simulado (um placeholder)
                const qrcodeContainer = document.getElementById('qrcode-container');
                qrcodeContainer.innerHTML = `
                    <div style="width: 200px; height: 200px; background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; border: 1px solid #ddd; border-radius: 4px;">
                        <p>QR Code do PIX<br>CNPJ: 49.450.443/0001-73<br>Valor: R$ ${total.toFixed(2)}</p>
                    </div>
                `;
                
                paymentModal.style.display = 'block';
                
                // Configurar botão de confirmar pagamento
                const confirmPaymentBtn = document.getElementById('confirm-payment');
                confirmPaymentBtn.addEventListener('click', function() {
                    // Simular o envio de um email (em um cenário real, isso seria feito no backend)
                    console.log(`Enviando e-mail para contato.mmomarket@gmail.com`);
                    console.log(`Assunto: Compra - Múltiplos Itens`);
                    console.log(`Corpo: ${cart.map(item => `
                        Jogo: ${item.gameName}
                        Servidor: ${item.server}
                        Quantidade: ${item.quantity}
                        Valor: R$ ${item.price.toFixed(2)}
                    `).join('\n')}`);
                    
                    // Fechar o modal de pagamento
                    paymentModal.style.display = 'none';
                    
                    // Exibir o modal de confirmação
                    const confirmationModal = document.getElementById('confirmation-modal');
                    confirmationModal.style.display = 'block';
                    
                    // Limpar o carrinho
                    localStorage.removeItem('cart');
                    
                    // Redirecionar após alguns segundos
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 5000);
                });
            });
        }
    }
});