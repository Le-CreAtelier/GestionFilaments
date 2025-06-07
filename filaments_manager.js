// js/filaments_manager.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const filamentForm = document.getElementById('filamentForm');
    const filamentListBody = document.getElementById('filamentListBody');
    const totalSpoolsTableDisplay = document.getElementById('totalSpoolsTable');
    const formNotifications = document.getElementById('formNotifications');
    const noFilamentsMessage = document.getElementById('noFilamentsMessage');
    const scrollToAddFormBtn = document.getElementById('scrollToAddFormBtn');
    const cardsFilamentsList = document.getElementById('cardsFilamentsList');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    let isCardView = true;

    // Filter elements
    const filterMaterialSelect = document.getElementById('filterMaterial');
    const filterColorInput = document.getElementById('filterColor');
    const lowStockThresholdInput = document.getElementById('lowStockThreshold');
    const sortSpoolsSelect = document.getElementById('sortSpools');

    // Load saved low stock threshold
    const savedLowStockThreshold = localStorage.getItem('lowStockThresholdSetting');
    if (savedLowStockThreshold) {
        lowStockThresholdInput.value = savedLowStockThreshold;
    }

    // Save low stock threshold on change
    lowStockThresholdInput.addEventListener('change', () => {
        localStorage.setItem('lowStockThresholdSetting', lowStockThresholdInput.value);
        renderFilaments(); // Re-render to apply new threshold
        updateGlobalStatsForHomepage(); // Update stats for index.html
    });

    // Form elements for Add/Edit
    const formTitle = document.getElementById('formTitle');
    const submitButton = document.getElementById('submitButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const filamentIdInput = document.getElementById('filamentId'); // Hidden input for ID

    // Modal elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const filamentToDeleteDetails = document.getElementById('filamentToDeleteDetails');
    let filamentIdToDelete = null;


        let filaments = []; // Main data store
    let brands = []; // To store brands for easy lookup
    let colors = []; // To store colors for the dropdown
    let materials = []; // To store materials for the dropdown

    // --- LocalStorage Functions ---
    function loadFilamentsFromStorage() {
        const storedFilaments = localStorage.getItem('filamentsDB');
        if (storedFilaments) {
            filaments = JSON.parse(storedFilaments);
        }
        // Load brands for ID mapping
        const storedBrands = localStorage.getItem('brandsDB');
        if (storedBrands) {
            brands = JSON.parse(storedBrands);
        }
        migrateFilamentsToUseBrandId(); // Ensure old filaments get brandId
        renderFilaments();
        updateGlobalStatsForHomepage(); // Update stats for index.html
        loadColorsForDropdown(); // Load colors for the dropdown
        loadMaterialsForDropdown(); // Load materials for the dropdown

        // Load and apply the low stock threshold for filtering
        const currentLowStockThreshold = parseInt(localStorage.getItem('lowStockThresholdSetting') || lowStockThresholdInput.value || 100);
        lowStockThresholdInput.value = currentLowStockThreshold;

        if (sortSpoolsSelect) {
            sortSpoolsSelect.addEventListener('change', renderFilaments);
        }
    }

    function saveFilamentsToStorage() {
        localStorage.setItem('filamentsDB', JSON.stringify(filaments));
        updateGlobalStatsForHomepage(); // Update stats for index.html
    }

    // --- Update stats for index.html (via localStorage) ---
    function updateGlobalStatsForHomepage() {
        localStorage.setItem('totalSpoolsCount', filaments.length);

        const totalValue = filaments.reduce((sum, f) => sum + (parseFloat(f.purchasePrice) || 0), 0);
        localStorage.setItem('totalStockValueAmount', totalValue.toFixed(2));

        const lowStockThreshold = parseInt(localStorage.getItem('lowStockThresholdSetting') || 100);
        const lowStockItems = filaments.filter(f => f.remainingWeight <= lowStockThreshold).length;
        localStorage.setItem('lowStockItemsCount', lowStockItems);

        const uniqueMaterials = [...new Set(filaments.map(f => f.material))].length;
        localStorage.setItem('uniqueMaterialsCount', uniqueMaterials);
    }


    // --- Helper function to get spool type details by ID ---
    function getSpoolTypeDetailsById(spoolTypeId) {
        const types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
        const foundType = types.find(t => t.id === spoolTypeId);
        if (foundType) {
            return { name: foundType.name, weight: foundType.weight };
        }
        return { name: 'N/A', weight: 0 }; // Default if not found or ID is null/undefined
    }

    // --- Helper function to get brand name by ID ---
    function getBrandNameById(brandId) {
        if (!brandId) return null; // Si aucun brandId n'est fourni, retourne null
        const brand = brands.find(b => b.id === brandId);
        return brand ? brand.name : `ID Marque ${brandId} introuvable`; // Retourne le nom ou un message d'erreur si ID non trouvé
    }

    // --- Migration function to add brandId to existing filaments ---
    function migrateFilamentsToUseBrandId() {
        let needsSave = false;
        filaments = filaments.map(filament => {
            if (!filament.brandId && filament.brand && filament.brand.trim() !== '') { // If no brandId but has a non-empty brand name
                const filamentBrandNameTrimmedLower = filament.brand.trim().toLowerCase();
                const brandObject = brands.find(b => b.name.trim().toLowerCase() === filamentBrandNameTrimmedLower);
                if (brandObject) {
                    filament.brandId = brandObject.id;
                    // delete filament.brand; // Optionally remove the old brand name field after successful migration
                    needsSave = true;
                } else {
                    // Optional: Log or handle cases where brand name exists but no match is found after trimming
                    console.warn(`Migration: No brand ID found for old brand name: "${filament.brand}"`);
                }
            }
            return filament;
        });
        if (needsSave) {
            saveFilamentsToStorage();
        }
    }

    // --- Load Materials for Dropdown --- 
    function loadMaterialsForDropdown() {
        const storedMaterials = localStorage.getItem('materials');
        if (storedMaterials) {
            materials = JSON.parse(storedMaterials);
        }
        populateMaterialDropdown();
        populateMaterialFilterDropdown();
    }

    function populateMaterialDropdown() {
        const materialSelect = document.getElementById('material');
        if (!materialSelect) return;
        materialSelect.innerHTML = '<option value="">Sélectionnez une matière</option>';
        materials.forEach(material => {
            const option = document.createElement('option');
            option.value = material.name; // Assuming material object has a name property
            option.textContent = material.name;
            materialSelect.appendChild(option);
        });
    }

    function populateMaterialFilterDropdown() {
        const filterMaterialSelect = document.getElementById('filterMaterial');
        if (!filterMaterialSelect) return;
        const currentFilterValue = filterMaterialSelect.value;
        filterMaterialSelect.innerHTML = '<option value="">Toutes les matières</option>'; 

        const uniqueFilamentMaterials = [...new Set(filaments.map(f => f.material).filter(Boolean))].sort();
        let allKnownMaterials = uniqueFilamentMaterials;
        const storedMaterialsRaw = localStorage.getItem('materials');
        if (storedMaterialsRaw) {
            const storedMaterialsArray = JSON.parse(storedMaterialsRaw).map(m => m.name);
            allKnownMaterials = [...new Set([...uniqueFilamentMaterials, ...storedMaterialsArray])].sort();
        }

        allKnownMaterials.forEach(materialName => {
            const option = document.createElement('option');
            option.value = materialName;
            option.textContent = materialName;
            filterMaterialSelect.appendChild(option);
        });

        if (allKnownMaterials.includes(currentFilterValue)) {
            filterMaterialSelect.value = currentFilterValue;
        } else {
            filterMaterialSelect.value = "";
        }
    }

    // --- Load Colors for Dropdown --- 
    function loadColorsForDropdown() {
        const storedColors = localStorage.getItem('colorsDB');
        if (storedColors) {
            colors = JSON.parse(storedColors);
        }
        populateColorDropdown();
        populateColorFilterDropdown(); // Also populate the filter dropdown
    }

    function populateColorDropdown() {
        const colorSelect = document.getElementById('color'); // Assuming your color input field has id 'color'
        if (!colorSelect || colorSelect.tagName !== 'SELECT') {
            console.warn('Color select dropdown not found or is not a SELECT element.');
            return;
        }

        // Clear existing options except the first one if it's a placeholder
        while (colorSelect.options.length > 1) {
            colorSelect.remove(1);
        }
        // If the first option is not a placeholder, clear all
        if (colorSelect.options.length === 1 && colorSelect.options[0].value !== "") {
             colorSelect.innerHTML = '<option value="">Sélectionnez une couleur</option>';
        } else if (colorSelect.options.length === 0) {
            colorSelect.innerHTML = '<option value="">Sélectionnez une couleur</option>';
        }


        colors.forEach(color => {
            const option = document.createElement('option');
            option.value = color.name; // Or color.id if you prefer to store ID
            option.textContent = color.name;
            // Optionally, add a visual cue for the color
            option.style.backgroundColor = color.hex;
            // Set text color for better contrast if needed
            // option.style.color = getContrastYIQ(color.hex); 
            colorSelect.appendChild(option);
        });
    }

    // Helper function for contrast (optional)
    /* function getContrastYIQ(hexcolor){
        hexcolor = hexcolor.replace("#", "");
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    } */

    // --- Manage Custom Color Addition --- 
    const showCustomColorFormButton = document.getElementById('showCustomColorFormButton');
    const customColorContainer = document.getElementById('customColorContainer');
    const addNewColorButton = document.getElementById('addNewColorButton');
    const customColorNameInput = document.getElementById('customColorName');
    const customColorHexInput = document.getElementById('customColorHex');

    if (showCustomColorFormButton) {
        showCustomColorFormButton.addEventListener('click', () => {
            customColorContainer.style.display = customColorContainer.style.display === 'none' ? 'block' : 'none';
            showCustomColorFormButton.textContent = customColorContainer.style.display === 'none' ? 'Ajouter une nouvelle couleur' : 'Masquer';
        });
    }

    if (addNewColorButton) {
        addNewColorButton.addEventListener('click', () => {
            const newName = customColorNameInput.value.trim();
            let newHex = customColorHexInput.value.trim();

            if (!newName) {
                showNotification('Le nom de la nouvelle couleur est requis.', 'error');
                return;
            }

            if (newHex && !/^#[0-9A-F]{6}$/i.test(newHex)) {
                showNotification('Le format du code Hexadécimal est invalide. Utilisez #RRGGBB.', 'error');
                return;
            }
            if (!newHex) { // Assign a random hex if not provided
                newHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            }

            let currentColors = JSON.parse(localStorage.getItem('colorsDB') || '[]');
            const existingColor = currentColors.find(c => c.name.toLowerCase() === newName.toLowerCase());
            if (existingColor) {
                showNotification('Une couleur avec ce nom existe déjà.', 'error');
                return;
            }

            const newColor = {
                id: crypto.randomUUID(),
                name: newName,
                hex: newHex
            };
            currentColors.push(newColor);
            localStorage.setItem('colorsDB', JSON.stringify(currentColors));
            
            // Refresh the global colors array and repopulate dropdown
            colors = currentColors; 
            populateColorDropdown();
            
            // Select the new color in the dropdown
            const colorSelect = document.getElementById('color');
            if(colorSelect) colorSelect.value = newName;

            showNotification(`Couleur "${newName}" ajoutée avec succès.`, 'success');
            customColorNameInput.value = '';
            customColorHexInput.value = '';
            customColorContainer.style.display = 'none';
            showCustomColorFormButton.textContent = 'Ajouter une nouvelle couleur';
        });
    }

    /* function getContrastYIQ(hexcolor){
        hexcolor = hexcolor.replace("#", "");
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    } */


    // --- UI Notification ---
    function showNotification(message, type = 'success', duration = 3000) {
        formNotifications.textContent = message;
        formNotifications.className = `form-message ${type}`; // 'success' or 'error'
        formNotifications.style.display = 'block';
        setTimeout(() => {
            formNotifications.style.display = 'none';
            formNotifications.textContent = '';
        }, duration);
    }

    // --- Populate Color Filter Dropdown ---
    function populateColorFilterDropdown() {
        const filterColorSelect = document.getElementById('filterColor'); // This is now a select
        if (!filterColorSelect || filterColorSelect.tagName !== 'SELECT') {
            console.warn('Filter color select dropdown not found or is not a SELECT element.');
            return;
        }

        const currentFilterValue = filterColorSelect.value;
        filterColorSelect.innerHTML = '<option value="">Toutes les couleurs</option>'; // Default option

        const uniqueFilamentColors = [...new Set(filaments.map(f => f.color).filter(Boolean))].sort();
        
        // Get additional colors from colorsDB that might not be in filaments yet
        const storedColorsRaw = localStorage.getItem('colorsDB');
        let allKnownColors = uniqueFilamentColors;
        if (storedColorsRaw) {
            const storedColorsArray = JSON.parse(storedColorsRaw).map(c => c.name);
            allKnownColors = [...new Set([...uniqueFilamentColors, ...storedColorsArray])].sort();
        }

        allKnownColors.forEach(colorName => {
            const option = document.createElement('option');
            option.value = colorName;
            option.textContent = colorName;
            // Try to find the hex for a visual cue if available in colorsDB
            const colorData = colors.find(c => c.name === colorName);
            if (colorData && colorData.hex) {
                option.style.backgroundColor = colorData.hex;
                // Basic contrast for text (optional, can be improved)
                // const hex = colorData.hex.replace("#", "");
                // const r = parseInt(hex.substr(0, 2), 16);
                // const g = parseInt(hex.substr(2, 2), 16);
                // const b = parseInt(hex.substr(4, 2), 16);
                // const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                // option.style.color = (yiq >= 128) ? 'black' : 'white';
            }
            filterColorSelect.appendChild(option);
        });

        if (allKnownColors.includes(currentFilterValue)) {
            filterColorSelect.value = currentFilterValue;
        } else {
            filterColorSelect.value = ""; // Reset if previous value is no longer valid
        }
    }

    // --- Render Filaments Table ---
    function createFilamentRow(filament, currentLowStockThreshold) {
        const row = document.createElement('tr');
        const spoolDetails = getSpoolTypeDetailsById(filament.spoolTypeId);
        row.insertCell().textContent = filament.material || '-';
        row.insertCell().textContent = filament.color || '-';
        let brandDisplayRow = 'Marque inconnue';
        if (filament.brandId) {
            brandDisplayRow = getBrandNameById(filament.brandId); // Contient déjà "ID Marque X introuvable" si échec
            // Si c'est un message d'erreur et qu'il y a un ancien nom de marque, l'ajouter pour contexte
            if (brandDisplayRow.startsWith('ID Marque') && filament.brand) {
                brandDisplayRow += ` (Ancien nom: ${filament.brand})`;
            }
        } else if (filament.brand && filament.brand.trim() !== '') {
            brandDisplayRow = `${filament.brand.trim()} (non migré)`;
        } else {
            // Si ni brandId ni ancien nom de marque valide, reste 'Marque inconnue'
        }
        row.insertCell().textContent = brandDisplayRow;
        row.insertCell().textContent = filament.diameter || '-';
        row.insertCell().textContent = spoolDetails.name; // Utilise le nom récupéré par ID
        row.insertCell().textContent = filament.totalSpoolWeight || '-';
        row.insertCell().textContent = filament.initialWeight || '0';
        row.insertCell().textContent = filament.remainingWeight || '0';
        const progressCell = row.insertCell();
        const percentage = (filament.initialWeight > 0) ? (filament.remainingWeight / filament.initialWeight) * 100 : 0;
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar-container';
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-bar-fill';
        progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        progressFill.textContent = `${Math.round(percentage)}%`;
        if (percentage <= (currentLowStockThreshold / filament.initialWeight * 100) && filament.initialWeight > 0) {
            progressFill.classList.add('low-stock-progress');
        }
        progressBar.appendChild(progressFill);
        progressCell.appendChild(progressBar);
        row.insertCell().textContent = filament.purchasePrice ? parseFloat(filament.purchasePrice).toFixed(2) + " €" : '-';
        row.insertCell().textContent = filament.purchaseDate || '-';
        row.insertCell().textContent = filament.location || '-';
        row.insertCell().textContent = filament.minPrintSpeed || '-';
        row.insertCell().textContent = filament.maxPrintSpeed || '-';
        row.insertCell().textContent = filament.minTemp || '-';
        row.insertCell().textContent = filament.maxTemp || '-';
        row.insertCell().textContent = filament.notes || '-';
        const actionsCell = row.insertCell();
        actionsCell.className = 'action-buttons';
        const editButton = document.createElement('button');
        editButton.innerHTML = '✏️ <span class="tooltiptext">Modifier</span>';
        editButton.className = 'btn-action-table btn-edit';
        editButton.onclick = () => loadFilamentForEdit(filament.id);
        actionsCell.appendChild(editButton);
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '🗑️ <span class="tooltiptext">Supprimer</span>';
        deleteButton.className = 'btn-action-table btn-delete';
        deleteButton.onclick = () => openDeleteModal(filament.id, `${filament.material} ${filament.color}`);
        actionsCell.appendChild(deleteButton);
        if (filament.remainingWeight <= currentLowStockThreshold) {
            row.classList.add('low-stock-row');
        }
        return row;
    }

    // Ajout d'une fonction utilitaire pour obtenir la couleur du statut
    function getStatusBadge(status) {
        let label = '';
        let color = '';
        switch (status) {
            case 'en_stock':
                label = 'En stock';
                color = '#22c55e'; // vert
                break;
            case 'en_usage':
                label = 'En usage';
                color = '#3b82f6'; // bleu
                break;
            case 'bientot_vide':
                label = 'Bientôt vide';
                color = '#facc15'; // jaune
                break;
            case 'vide':
                label = 'Vide';
                color = '#ef4444'; // rouge
                break;
            default:
                label = 'Inconnu';
                color = '#a3a3a3'; // gris
        }
        return `<span class="status-badge" style="background:${color};">${label}</span>`;
    }
    function createFilamentCard(filament, currentLowStockThreshold) {
        const card = document.createElement('div');
        card.className = 'filament-card-v2';
    
        // Formatter les données pour un affichage plus propre
        const spoolDetails = getSpoolTypeDetailsById(filament.spoolTypeId);
        const materialColor = `${filament.material || 'N/A'} ${filament.color || ''}`;
        let brandDisplayCard = 'Marque inconnue';
        if (filament.brandId) {
            brandDisplayCard = getBrandNameById(filament.brandId); // Contient déjà "ID Marque X introuvable" si échec
            // Si c'est un message d'erreur et qu'il y a un ancien nom de marque, l'ajouter pour contexte
            if (brandDisplayCard.startsWith('ID Marque') && filament.brand) {
                brandDisplayCard += ` (Ancien nom: ${filament.brand})`;
            }
        } else if (filament.brand && filament.brand.trim() !== '') {
            brandDisplayCard = `${filament.brand.trim()} (non migré)`;
        } else {
            // Si ni brandId ni ancien nom de marque valide, reste 'Marque inconnue'
        }
        const brand = brandDisplayCard;
        const spoolType = spoolDetails.name; // Utilise le nom récupéré par ID
        const diameter = filament.diameter ? `${filament.diameter}mm` : 'N/A';
        const initialWeight = filament.initialWeight ? `${filament.initialWeight}g` : 'N/A';
        const remainingWeight = filament.remainingWeight ? `${filament.remainingWeight}g` : 'N/A';
        const tempRange = (filament.minTemp && filament.maxTemp) ? `${filament.minTemp} - ${filament.maxTemp}°C` : 'N/A';
        const speedRange = (filament.minPrintSpeed && filament.maxPrintSpeed) ? `${filament.minPrintSpeed} - ${filament.maxPrintSpeed}mm/s` : 'N/A';
    
        // Badge d'emplacement
        const locationBadge = filament.location
            ? `<span class="location-badge">📍 ${filament.location}</span>`
            : '';
        // Badge de statut
        const statusBadge = getStatusBadge(filament.status);
    
        card.innerHTML = `
          <div class="card-header-v2">
            <div class="title-container">
                <h3 class="card-title-v2">${materialColor}</h3>
                ${locationBadge}
                ${statusBadge}
            </div>
            <div class="card-brand-v2">${brand} 🧵</div>
          </div>
    
          <div class="card-section-v2">
            <h4>Infos Bobine</h4>
            <div class="details-grid">
              <span><strong>Type:</strong> ${spoolType}</span>
              ${diameter !== 'N/A' ? `<span><strong>Ø:</strong> ${diameter}</span>` : ''}
              <span><strong>Initial:</strong> ${initialWeight}</span>
            </div>
          </div>
          
          <div class="card-section-v2">
            <h4>Paramètres d'impression</h4>
            <div class="details-grid">
              <span><strong>Temp:</strong> ${tempRange}</span>
              <span><strong>Vitesse:</strong> ${speedRange}</span>
            </div>
          </div>
    
          <div class="card-footer-v2">
            <div class="progress-section">
                <div class="progress-bar-container">
                </div>
            <span class="remaining-weight">${remainingWeight} restants</span>
        </div>
        <div class="action-buttons">
            <button class="btn-edit" title="Modifier">✏️</button>
            <button class="btn-delete" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
    
        // Logique pour la barre de progression (légèrement adaptée)
        const percentage = (filament.initialWeight > 0) ? (filament.remainingWeight / filament.initialWeight) * 100 : 0;
        const progressBarContainer = card.querySelector('.progress-bar-container');
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-bar-fill';
        progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        progressFill.textContent = `${Math.round(percentage)}%`;
        if (percentage <= (currentLowStockThreshold / filament.initialWeight * 100) && filament.initialWeight > 0) {
            progressFill.classList.add('low-stock-progress');
        }
        progressBarContainer.appendChild(progressFill);
    
        // Ajout des événements sur les boutons
        card.querySelector('.btn-edit').onclick = () => loadFilamentForEdit(filament.id);
        card.querySelector('.btn-delete').onclick = () => openDeleteModal(filament.id, materialColor);
    
        return card;
    }

    // --- Render Filaments in Table or Cards --- (Refactored for clarity)
    function renderFilaments() {
        // Clear current list
        if (isCardView && cardsFilamentsList) {
            cardsFilamentsList.innerHTML = '';
        } else if (!isCardView && filamentListBody) {
            filamentListBody.innerHTML = '';
        }

        const materialFilter = filterMaterialSelect ? filterMaterialSelect.value : '';
        const colorFilter = filterColorInput ? filterColorInput.value : ''; // Assuming filterColorInput is the ID of your color filter select
        const lowStockThreshold = lowStockThresholdInput ? parseInt(lowStockThresholdInput.value) : 0;
        const sortValue = sortSpoolsSelect ? sortSpoolsSelect.value : 'default';

        let filteredFilaments = filaments.filter(filament => {
            const matchesMaterial = !materialFilter || filament.material === materialFilter;
            const matchesColor = !colorFilter || filament.color === colorFilter;
            // No specific low stock filter here, it's for visual cues or separate lists
            return matchesMaterial && matchesColor;
        });

        // Sort filaments
        switch (sortValue) {
            case 'name-asc':
                filteredFilaments.sort((a, b) => (getBrandNameById(a.brandId) + ' ' + a.color).localeCompare(getBrandNameById(b.brandId) + ' ' + b.color));
                break;
            case 'name-desc':
                filteredFilaments.sort((a, b) => (getBrandNameById(b.brandId) + ' ' + b.color).localeCompare(getBrandNameById(a.brandId) + ' ' + a.color));
                break;
            case 'remaining-asc':
                filteredFilaments.sort((a, b) => a.remainingWeight - b.remainingWeight);
                break;
            case 'remaining-desc':
                filteredFilaments.sort((a, b) => b.remainingWeight - a.remainingWeight);
                break;
            case 'purchaseDate-asc':
                filteredFilaments.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                break;
            case 'purchaseDate-desc':
                filteredFilaments.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
                break;
            // Default: no specific sort or sort by ID/addition order if needed
        }

        if (totalSpoolsTableDisplay) {
            totalSpoolsTableDisplay.textContent = filteredFilaments.length;
        }

        if (filteredFilaments.length === 0) {
            if (noFilamentsMessage) noFilamentsMessage.style.display = 'block';
            if (isCardView && cardsFilamentsList) cardsFilamentsList.innerHTML = ''; // Ensure it's clear
            else if (!isCardView && filamentListBody) filamentListBody.innerHTML = ''; // Ensure it's clear
            return;
        }
        if (noFilamentsMessage) noFilamentsMessage.style.display = 'none';

        filteredFilaments.forEach(filament => {
            if (isCardView && cardsFilamentsList) {
                cardsFilamentsList.appendChild(createFilamentCard(filament, lowStockThreshold));
            } else if (!isCardView && filamentListBody) {
                filamentListBody.appendChild(createFilamentRow(filament, lowStockThreshold));
            }
        });
    }

    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', () => {
            isCardView = !isCardView;
            toggleViewBtn.textContent = isCardView ? 'Vue tableau' : 'Vue cartes';
            renderFilaments();
        });
    }

    // --- Add/Edit Filament ---
    filamentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const id = filamentIdInput.value || Date.now().toString();
        const newFilament = {
            id: id,
            material: filamentForm.material.value.trim(),
            color: filamentForm.color.value.trim(),
            brandId: filamentForm.brand.value, // Store brand ID
            // brand: filamentForm.brand.options[filamentForm.brand.selectedIndex].text, // Keep if you need name for some reason, but ID is primary
            spoolTypeId: filamentForm.spoolType.value, // Stocker l'ID du type de bobine
            totalSpoolWeight: parseFloat(filamentForm.totalSpoolWeight.value) || 0, // Poids total calculé
            initialWeight: parseFloat(filamentForm.initialWeight.value) || 0,
            remainingWeight: parseFloat(filamentForm.remainingWeight.value) || 0,
            purchasePrice: parseFloat(filamentForm.purchasePrice.value) || null,
            purchaseDate: filamentForm.purchaseDate.value,
            location: filamentForm.location.value.trim(),
            minPrintSpeed: filamentForm.minPrintSpeed.value.trim(),
            maxPrintSpeed: filamentForm.maxPrintSpeed.value.trim(),
            minTemp: filamentForm.minTemp.value.trim(),
            maxTemp: filamentForm.maxTemp.value.trim(),
            notes: filamentForm.notes.value.trim(),
            status: filamentForm.status.value // Ajout du statut
        };
        // Si édition, remplacer l'ancien, sinon ajouter
        const existingIndex = filaments.findIndex(f => f.id === id);
        if (existingIndex !== -1) {
            filaments[existingIndex] = newFilament;
            showNotification('Bobine modifiée avec succès.', 'success');
        } else {
            filaments.push(newFilament);
            showNotification('Nouvelle bobine ajoutée !', 'success');
        }
        saveFilamentsToStorage();
        renderFilaments();
        filamentForm.reset();
        cancelEditButton.style.display = 'none';
        filamentIdInput.value = '';
    });

    function loadFilamentForEdit(id) {
        const filament = filaments.find(f => f.id === id);
        if (!filament) return;
        filamentIdInput.value = filament.id;
        document.getElementById('material').value = filament.material || '';
        document.getElementById('brand').value = filament.brandId || ''; // Use brandId for selection
        document.getElementById('color').value = filament.color || '';
        document.getElementById('totalSpoolWeight').value = filament.totalSpoolWeight || '';
        document.getElementById('spoolType').value = filament.spoolTypeId || ''; // Changé de spoolType à spoolTypeId
        document.getElementById('initialWeight').value = filament.initialWeight || '';
        document.getElementById('remainingWeight').value = filament.remainingWeight || '';
        document.getElementById('location').value = filament.location || '';
        document.getElementById('purchaseDate').value = filament.purchaseDate || '';
        document.getElementById('purchasePrice').value = filament.purchasePrice || '';
        document.getElementById('minPrintSpeed').value = filament.minPrintSpeed || '';
        document.getElementById('maxPrintSpeed').value = filament.maxPrintSpeed || '';
        document.getElementById('minTemp').value = filament.minTemp || '';
        document.getElementById('maxTemp').value = filament.maxTemp || '';
        document.getElementById('notes').value = filament.notes || '';
        document.getElementById('status').value = filament.status || 'en_stock'; // Nouveau champ
        formTitle.textContent = '✏️ Modifier la Bobine';
        submitButton.textContent = 'Enregistrer les Modifications';
        cancelEditButton.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Populate Select Options (Materials, Brands, Spool Types) ---
    function populateBrandOptions() {
        const brandSelect = document.getElementById('brand'); // Assuming this is the ID of your brand select in filaments form
        if (!brandSelect) return;

        const storedBrands = JSON.parse(localStorage.getItem('brandsDB') || '[]');
        brandSelect.innerHTML = '<option value="">Sélectionner une marque</option>'; // Default option

        storedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.id; // Use brand ID as value
            option.textContent = brand.name;
            brandSelect.appendChild(option);
        });
    }

    // --- Populate Spool Type Dropdown ---
    function populateSpoolTypeDropdown() {
        const spoolTypeSelect = document.getElementById('spoolType');
        if (!spoolTypeSelect) return;
        const currentSpoolTypeId = spoolTypeSelect.value; // Conserver la valeur sélectionnée si possible
        spoolTypeSelect.innerHTML = '';
        const types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
        if (types.length > 0) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Sélectionnez un type';
            spoolTypeSelect.appendChild(defaultOption);

            types.forEach(type => {
                if (type.id && type.name) { // S'assurer que les types ont bien un ID et un nom
                    const opt = document.createElement('option');
                    opt.value = type.id;
                    opt.textContent = `${type.name} (${type.weight || 'N/A'}g)`;
                    spoolTypeSelect.appendChild(opt);
                }
            });
            // Restaurer la sélection si elle existait et est toujours valide, sinon s'assurer que l'option par défaut est sélectionnée
            if (currentSpoolTypeId && types.some(t => t.id === currentSpoolTypeId)){
                spoolTypeSelect.value = currentSpoolTypeId;
            } else {
                spoolTypeSelect.value = ''; // Sélectionne l'option 'Sélectionnez un type'
            }
        } else {
            // Si aucun type n'est défini, afficher uniquement le message désactivé
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Aucun type de bobine défini';
            opt.disabled = true;
            spoolTypeSelect.appendChild(opt);
            spoolTypeSelect.value = ''; // S'assurer que cette option est sélectionnée
        }
    }
    // Call on load
    populateSpoolTypeDropdown();
    populateBrandOptions(); // Call on load
    function resetForm() {
        filamentForm.reset();
        filamentIdInput.value = ''; // Clear hidden ID
        formTitle.textContent = '➕ Ajouter une Nouvelle Bobine';
        submitButton.textContent = 'Ajouter la Bobine';
        cancelEditButton.style.display = 'none';
        populateSpoolTypeDropdown();
        populateBrandOptions(); // Repopulate brands on form reset
    }

    cancelEditButton.addEventListener('click', resetForm);

    // --- Delete Filament ---
    function openDeleteModal(id, name) {
        filamentIdToDelete = id;
        filamentToDeleteDetails.textContent = `Bobine : ${name}`;
        deleteConfirmModal.style.display = 'block';
    }

    function closeDeleteModal() {
        deleteConfirmModal.style.display = 'none';
        filamentIdToDelete = null;
        filamentToDeleteDetails.textContent = '';
    }

    confirmDeleteBtn.addEventListener('click', () => {
        if (filamentIdToDelete) {
            filaments = filaments.filter(f => f.id !== filamentIdToDelete);
            saveFilamentsToStorage();
            renderFilaments();
            showNotification('Bobine supprimée avec succès.', 'success');
        }
        closeDeleteModal();
    });

    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    // Close modal if clicked outside content (optional)
    window.onclick = function(event) {
        if (event.target == deleteConfirmModal) {
            closeDeleteModal();
        }
    }

    // --- Event Listeners for Filters ---
    filterMaterialSelect.addEventListener('change', renderFilaments);
    // filterColorInput.addEventListener('input', renderFilaments); // Old listener for input field
    document.getElementById('filterColor').addEventListener('change', renderFilaments); // New listener for select
    lowStockThresholdInput.addEventListener('input', () => {
        renderFilaments(); // Re-render to apply low-stock visual cues
        updateGlobalStatsForHomepage(); // Update overall low stock count
    });

    // Scroll to form button
    if(scrollToAddFormBtn){
        scrollToAddFormBtn.addEventListener('click', () => {
            const formSection = document.getElementById('addEditFilamentSection');
            if(formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
                // Optionally, focus the first input field
                document.getElementById('material').focus();
            }
        });
    }
     // Check for #add in URL to scroll to form on page load
    if (window.location.hash === '#add') {
        const formSection = document.getElementById('addEditFilamentSection');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth' });
            document.getElementById('material').focus();
        }
    }


    // --- Initial Load ---
        populateBrandOptions(); // Populate brand dropdown
        loadFilamentsFromStorage(); // Load and render
        loadMaterialsForDropdown(); // Populate material dropdowns
});

    // --- Auto-calculate material weight when spool type or total weight changes ---
    const spoolTypeSelect = document.getElementById('spoolType');
    const totalSpoolWeightInput = document.getElementById('totalSpoolWeight');
    const initialWeightInput = document.getElementById('initialWeight');

    function getSpoolWeightById(typeId) {
        const types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
        const found = types.find(t => t.id === typeId);
        return found ? parseInt(found.weight, 10) : 0; // Retourne 0 si non trouvé ou poids non défini
    }

    function updateMaterialWeight() {
        const selectedTypeId = spoolTypeSelect.value;
        const totalWeight = parseInt(totalSpoolWeightInput.value, 10);
        const spoolWeight = getSpoolWeightById(selectedTypeId); // Utilise l'ID
        if (!isNaN(totalWeight) && !isNaN(spoolWeight) && totalWeight > spoolWeight && spoolWeight > 0) { // Ajout de spoolWeight > 0 pour éviter calcul avec 0
            initialWeightInput.value = totalWeight - spoolWeight;
            initialWeightInput.disabled = true;
            initialWeightInput.classList.add('highlight-auto');
        } else {
            initialWeightInput.value = '';
            initialWeightInput.disabled = false;
            initialWeightInput.classList.remove('highlight-auto');
        }
    }

    if (spoolTypeSelect && totalSpoolWeightInput && initialWeightInput) {
        spoolTypeSelect.addEventListener('change', updateMaterialWeight);
        totalSpoolWeightInput.addEventListener('input', updateMaterialWeight);
        // Permettre à l'utilisateur de cliquer pour éditer manuellement
        initialWeightInput.addEventListener('dblclick', function() {
            initialWeightInput.disabled = false;
            initialWeightInput.classList.remove('highlight-auto');
        });
    }

    // --- Brand & Color Management ---
    function loadColorsFromStorage() {
        const stored = localStorage.getItem('colorsDB');
        return stored ? JSON.parse(stored) : [];
    }
    function saveColorsToStorage(colors) {
        localStorage.setItem('colorsDB', JSON.stringify(colors));
    }
    // La fonction populateBrandSelect est remplacée par populateBrandDropdown et les fonctions loadBrandsFromStorage/saveBrandsToStorage ne sont plus utilisées ici directement.
    function populateColorSelect() {
        const colorInput = document.getElementById('color');
        let colors = loadColorsFromStorage();
        colors = [...new Set(colors.map(c => c.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        let datalist = document.getElementById('colorList');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'colorList';
            colorInput.setAttribute('list', 'colorList');
            colorInput.parentNode.insertBefore(datalist, colorInput.nextSibling);
        }
        datalist.innerHTML = colors.map(c => `<option value="${c}">`).join('');
    }
    function addBrandIfNew(brand) {
        if (!brand) return;
        let brands = loadBrandsFromStorage();
        if (!brands.map(b=>b.toLowerCase()).includes(brand.toLowerCase())) {
            brands.push(brand);
            saveBrandsToStorage(brands);
            populateBrandSelect();
        }
    }
    function addColorIfNew(color) {
        if (!color) return;
        let colors = loadColorsFromStorage();
        if (!colors.map(c=>c.toLowerCase()).includes(color.toLowerCase())) {
            colors.push(color);
            saveColorsToStorage(colors);
            populateColorSelect();
        }
    }
    // Populate on load
    populateColorSelect();
    