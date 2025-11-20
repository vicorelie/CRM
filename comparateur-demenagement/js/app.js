// DéménagePro - Application JavaScript
// Gestion du formulaire multi-étapes

let currentStep = 1;
const totalSteps = 3;

// ============================================
// NAVIGATION DANS LE FORMULAIRE
// ============================================

function nextStep() {
    if (validateStep(currentStep)) {
        // Masquer l'étape actuelle
        document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('completed');
        document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

        // Afficher l'étape suivante
        currentStep++;
        document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
        document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

        // Scroll vers le haut du formulaire
        document.getElementById('form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function prevStep() {
    // Masquer l'étape actuelle
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

    // Afficher l'étape précédente
    currentStep--;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('completed');

    // Scroll vers le haut du formulaire
    document.getElementById('form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// VALIDATION DES ÉTAPES
// ============================================

function validateStep(step) {
    const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = currentStepElement.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                isValid = false;
                showError(input, 'Veuillez sélectionner une option');
            }
        } else if (input.type === 'checkbox' && input.name === 'consent') {
            if (!input.checked) {
                isValid = false;
                showError(input, 'Vous devez accepter pour continuer');
            }
        } else if (!input.value.trim()) {
            isValid = false;
            showError(input, 'Ce champ est requis');
        } else {
            clearError(input);
        }
    });

    // Validation spécifique pour l'email
    const emailInput = currentStepElement.querySelector('input[type="email"]');
    if (emailInput && emailInput.value) {
        if (!validateEmail(emailInput.value)) {
            isValid = false;
            showError(emailInput, 'Email invalide');
        }
    }

    // Validation spécifique pour le téléphone
    const telInput = currentStepElement.querySelector('input[type="tel"]');
    if (telInput && telInput.value) {
        if (!validatePhone(telInput.value)) {
            isValid = false;
            showError(telInput, 'Numéro de téléphone invalide');
        }
    }

    // Validation des dates (doit être dans le futur)
    const dateInput = currentStepElement.querySelector('input[type="date"]');
    if (dateInput && dateInput.value) {
        const selectedDate = new Date(dateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            isValid = false;
            showError(dateInput, 'La date doit être dans le futur');
        }
    }

    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    // Accepte différents formats de téléphone français
    const re = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return re.test(phone.replace(/\s/g, ''));
}

function showError(input, message) {
    // Supprimer l'ancien message d'erreur s'il existe
    clearError(input);

    // Ajouter la classe d'erreur
    input.style.borderColor = '#EF4444';

    // Créer et ajouter le message d'erreur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#EF4444';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;

    input.parentElement.appendChild(errorDiv);
}

function clearError(input) {
    input.style.borderColor = '';
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// ============================================
// SOUMISSION DU FORMULAIRE
// ============================================

document.getElementById('devis-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateStep(currentStep)) {
        return;
    }

    // Afficher un loader
    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    submitBtn.disabled = true;

    // Collecter toutes les données du formulaire
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // Collecter les cases à cocher multiples
    data.services = [];
    if (formData.get('emballage')) data.services.push('emballage');
    if (formData.get('demontage')) data.services.push('demontage');
    if (formData.get('stockage')) data.services.push('stockage');
    if (formData.get('piano')) data.services.push('piano');

    console.log('Données du formulaire:', data);

    try {
        // Envoyer les données à l'API
        const response = await fetch('api/submit-devis.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Rediriger vers la page de confirmation ou afficher un message
            showSuccessMessage();
        } else {
            throw new Error(result.message || 'Une erreur est survenue');
        }

    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

function showSuccessMessage() {
    const formCard = document.querySelector('.form-card');
    formCard.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
            <div style="width: 80px; height: 80px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            </div>
            <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-dark);">
                Demande envoyée avec succès !
            </h2>
            <p style="font-size: 1.125rem; color: var(--text-light); margin-bottom: 2rem;">
                Vous allez recevoir jusqu'à 5 devis de déménageurs dans les prochaines 24 heures.
            </p>
            <div style="background: #F3F4F6; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                <p style="color: var(--text-dark); margin-bottom: 0.5rem;">
                    <i class="fas fa-envelope" style="color: var(--primary-color);"></i>
                    <strong>Email de confirmation envoyé</strong>
                </p>
                <p style="color: var(--text-light); font-size: 0.875rem;">
                    Vérifiez votre boîte de réception
                </p>
            </div>
            <button onclick="window.location.reload()" class="btn-primary" style="width: auto; padding: 1rem 2rem;">
                <i class="fas fa-home"></i> Retour à l'accueil
            </button>
        </div>
    `;
}

// ============================================
// UTILITAIRES
// ============================================

function scrollToForm() {
    document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.style.display === 'flex') {
        navMenu.style.display = 'none';
    } else {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '100%';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'white';
        navMenu.style.padding = '1rem';
        navMenu.style.boxShadow = 'var(--shadow)';
    }
}

// Auto-formatage du numéro de téléphone
document.getElementById('telephone')?.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length > 0) {
        value = value.match(/.{1,2}/g).join(' ');
        e.target.value = value;
    }
});

// Définir la date minimum à aujourd'hui
const dateInput = document.getElementById('date-demenagement');
if (dateInput) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    dateInput.min = formattedDate;
}

// Smooth scroll pour les liens d'ancrage
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Fermer le menu mobile en cliquant sur un lien
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', function() {
        const navMenu = document.querySelector('.nav-menu');
        if (window.innerWidth <= 968) {
            navMenu.style.display = 'none';
        }
    });
});

console.log('✅ DéménagePro app initialized');
