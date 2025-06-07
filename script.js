// js/script.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Page d'accueil chargée et script.js est actif.");

    // Exemple : Mettre à jour les valeurs des cartes (vous devrez adapter ceci avec vos vraies données)
    // Ces valeurs pourraient provenir de localStorage ou d'un appel API.
    const totalSpools = localStorage.getItem('totalSpoolsCount') || 1; // Exemple de valeur par défaut
    const stockValue = parseFloat(localStorage.getItem('totalStockValueAmount') || 0.00).toFixed(2);
    const materialsCount = localStorage.getItem('uniqueMaterialsCount') || 1;
    const lowStockCount = localStorage.getItem('lowStockItemsCount') || 0;

    const totalSpoolsValueElement = document.getElementById('totalSpoolsValue');
    const stockValueElement = document.getElementById('stockValue');
    const materialsCountElement = document.getElementById('materialsCount');
    const lowStockCountValueElement = document.getElementById('lowStockCountValue');

    if (totalSpoolsValueElement) totalSpoolsValueElement.textContent = totalSpools;
    if (stockValueElement) stockValueElement.textContent = stockValue + '€';
    if (materialsCountElement) materialsCountElement.textContent = materialsCount;
    if (lowStockCountValueElement) lowStockCountValueElement.textContent = lowStockCount;

    // Logique pour les filaments récents (simplifié)
    const recentFilamentsPanel = document.querySelector('.recent-filaments-panel');
    const filaments = JSON.parse(localStorage.getItem('filamentsDB')) || [];

    // Afficher les X derniers filaments ajoutés comme "récents"
    const MAX_RECENT_FILAMENTS = 3;
    const recentFilamentsContainer = recentFilamentsPanel.querySelector('.view-all-filaments'); // Pour insérer avant ce lien

    if (filaments.length > 0 && recentFilamentsContainer) {
        // Vider les items par défaut s'il y en a déjà dans le HTML (sauf le titre et le lien "voir tous")
        const existingItems = recentFilamentsPanel.querySelectorAll('.recent-filament-item');
        existingItems.forEach(item => item.remove());

        filaments.slice(-MAX_RECENT_FILAMENTS).reverse().forEach(filament => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('recent-filament-item');

            const nameP = document.createElement('p');
            nameP.classList.add('filament-name');
            nameP.textContent = `${filament.material || 'N/A'} ${filament.color || ''}`;

            const brandP = document.createElement('p');
            brandP.classList.add('filament-brand');
            brandP.textContent = filament.brand || 'Marque inconnue';

            const percentageSpan = document.createElement('span');
            percentageSpan.classList.add('filament-percentage');
            let percentage = 0;
            if (filament.initialWeight > 0) {
                percentage = Math.round((filament.remainingWeight / filament.initialWeight) * 100);
            }
            percentageSpan.textContent = `${percentage}%`;

            itemDiv.appendChild(nameP);
            itemDiv.appendChild(brandP);
            itemDiv.appendChild(percentageSpan);

            recentFilamentsPanel.insertBefore(itemDiv, recentFilamentsContainer);
        });
    } else if (recentFilamentsContainer) {
        // S'il n'y a pas de filaments, on peut afficher un message
        const existingItems = recentFilamentsPanel.querySelectorAll('.recent-filament-item');
        existingItems.forEach(item => item.remove()); // Enlever l'exemple statique
        const noFilamentMsg = document.createElement('p');
        noFilamentMsg.textContent = "Aucun filament récent à afficher.";
        noFilamentMsg.style.textAlign = "center";
        noFilamentMsg.style.color = "#666";
        recentFilamentsPanel.insertBefore(noFilamentMsg, recentFilamentsContainer);

    }


    // Rediriger les boutons "Actions rapides" vers les pages correspondantes
    const addFilamentButtonAction = document.querySelector('.actions-panel .btn-action-blue'); // + Ajouter...
    const viewDashboardButtonAction = document.querySelector('.actions-panel .btn-action:nth-child(3)'); // Voir tableau de bord
    const viewAssistantButtonAction = document.querySelector('.actions-panel .btn-action:nth-child(4)'); // Consulter l'assistant IA

    if (addFilamentButtonAction) {
        addFilamentButtonAction.addEventListener('click', () => {
            // Pourrait ouvrir un modal ou rediriger vers une page d'ajout
            // Pour l'instant, on peut simuler une redirection vers la page filaments.html où serait le formulaire
            window.location.href = 'filaments.html#add'; // L'ancre #add pourrait faire scroller au formulaire
        });
    }
    if (viewDashboardButtonAction) {
        viewDashboardButtonAction.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    if (viewAssistantButtonAction) {
        viewAssistantButtonAction.addEventListener('click', () => {
            window.location.href = 'assistant.html';
        });
    }

    // Le bouton "Voir mes filaments" dans le header
    const viewMyFilamentsHeaderButton = document.querySelector('.main-header .btn-primary');
    if(viewMyFilamentsHeaderButton) {
        viewMyFilamentsHeaderButton.addEventListener('click', () => {
            window.location.href = 'filaments.html';
        });
    }

});
