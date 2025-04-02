document.addEventListener('DOMContentLoaded', function() {
    // Banner Slider
    if (document.querySelector('.banner-slider')) {
        const slides = document.querySelectorAll('.slide');
        let currentSlide = 0;
        
        function showSlide(n) {
            slides.forEach(slide => slide.classList.remove('active'));
            slides[n].classList.add('active');
        }
        
        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }
        
        // Iniciar o slider
        showSlide(0);
        
        // Mudar slides a cada 5 segundos
        setInterval(nextSlide, 5000);
    }
    
    // Máscara para campos de WhatsApp
    if (document.querySelector('#whatsapp')) {
        const whatsappInputs = document.querySelectorAll('#whatsapp, #other-whatsapp');
        whatsappInputs.forEach(input => {
            input.addEventListener('input', function() {
                let value = this.value.replace(/\D/g, '');
                if (value.length > 11) value = value.substring(0, 11);
                
                let formattedValue = '';
                if (value.length > 0) {
                    formattedValue += `(${value.substring(0, 2)}`;
                    if (value.length > 2) {
                        formattedValue += `)${value.substring(2, 7)}`;
                        if (value.length > 7) {
                            formattedValue += `-${value.substring(7, 11)}`;
                        }
                    }
                }
                this.value = formattedValue;
            });
        });
    }
    
    // Modal de confirmação
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            modals[index].style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    });
});