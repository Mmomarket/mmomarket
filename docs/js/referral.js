// docs/js/referral.js
(function() {
    // Função para obter parâmetros da URL
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    
    // Verificar se existe um parâmetro ref na URL
    const refCode = getUrlParameter('ref');
    
    if (refCode) {
        // Salvar o código de referência no localStorage
        localStorage.setItem('refCode', refCode);
        console.log(`Código de referência salvo: ${refCode}`);
        
        // Opcional: Remover o parâmetro da URL para limpar
        if (window.history.replaceState) {
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
})();