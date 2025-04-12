// Este arquivo contém funções auxiliares para processamento de transações
window.serviceHelper = {
    // Use um nome neutro como "process" em vez de "payment"
    prepareProcess: async function(data) {
        try {
            //const APP_SERVICE = 'http://localhost:3000/api';
            const APP_SERVICE = 'mmomarket-production.up.railway.app';
            const response = await fetch(`${APP_SERVICE}/process/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao processar:', error);
            throw error;
        }
    },
    
    checkProcessStatus: async function(id) {
        try {
            //const APP_SERVICE = 'http://localhost:3000/api';
            const APP_SERVICE = 'mmomarket-production.up.railway.app';
            const response = await fetch(`${APP_SERVICE}/process/status/${id}`);
            return await response.json();
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            throw error;
        }
    },

    // Métodos alternativos para quando o bloqueador interferir
    showManualOptions: function(orderId, container) {
        container.innerHTML = `
            <div class="alternative-options">
                <h3>Opções alternativas de pagamento</h3>
                <p>Se estiver com problemas para visualizar o QR Code, use uma destas opções:</p>
                
                <button class="primary-btn" onclick="serviceHelper.copyKey('${orderId}')">
                    Copiar Chave Manual
                </button>
                
                <button class="secondary-btn mt-2" onclick="serviceHelper.showInstructions('${orderId}')">
                    Ver Instruções
                </button>
                
                <div class="text-center mt-3">
                    <a href="#" onclick="serviceHelper.tryAgain(); return false;">Tentar novamente</a>
                </div>
            </div>
        `;
    },
    
    copyKey: function(orderId) {
        const key = "contato.mmomarket@gmail.com";
        navigator.clipboard.writeText(key).then(function() {
            alert("Chave copiada! Use-a em seu aplicativo de banco e informe o ID: " + orderId);
        });
    },
    
    showInstructions: function(orderId) {
        alert(`Instruções para pagamento manual:
1. Abra o aplicativo do seu banco
2. Escolha a opção "Pagar"
3. Use a chave: contato.mmomarket@gmail.com
4. Na descrição, informe o ID: ${orderId}
5. Após concluir, clique em "Confirmar" e aguarde a verificação`);
    },
    
    tryAgain: function() {
        alert("Tente desativar temporariamente o bloqueador de anúncios e recarregue a página.");
        window.location.reload();
    }
};