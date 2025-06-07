document.addEventListener('DOMContentLoaded', () => {
    const brandForm = document.getElementById('brandForm');
    const brandNameInput = document.getElementById('brandName');
    const brandsTableBody = document.getElementById('brandsTableBody');
    const cancelEditBrandButton = document.getElementById('cancelEditBrand');
    let editingBrandId = null; // Pour suivre l'ID de la marque en cours d'édition
    const FILAMENTS_DB_KEY = 'filamentsDB'; // Clé pour les filaments
    const BRANDS_DB_KEY = 'brandsDB'; // Clé pour les marques

    // Charger et afficher les marques existantes
    loadBrands();

    brandForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const brandName = brandNameInput.value.trim();

        if (brandName) {
            if (editingBrandId) {
                updateBrand(editingBrandId, brandName);
            } else {
                addBrand(brandName);
            }
            resetForm();
            loadBrands(); // Recharger la liste
        } else {
            alert('Veuillez entrer un nom de marque.');
        }
    });

    function addBrand(name) {
        const brands = getBrands();
        // Vérifier si la marque existe déjà (insensible à la casse) pour une nouvelle marque
        if (brands.some(brand => brand.name.toLowerCase() === name.toLowerCase())) {
            alert('Cette marque existe déjà.');
            return;
        }
        const newBrand = {
            id: generateUniqueId(), // Générer un ID unique
            name: name
        };
        brands.push(newBrand);
        saveBrands(brands);
    }

    function getBrands() {
        return JSON.parse(localStorage.getItem(BRANDS_DB_KEY) || '[]');
    }

    function saveBrands(brands) {
        localStorage.setItem(BRANDS_DB_KEY, JSON.stringify(brands));
    }

    function loadBrands() {
        let brands = getBrands();
        brandsTableBody.innerHTML = ''; // Vider le tableau existant

        // S'assurer que toutes les marques ont un ID
        let needsSave = false;
        brands = brands.map(brand => {
            if (!brand.id) {
                brand.id = generateUniqueId();
                needsSave = true;
            }
            return brand;
        });

        if (needsSave) {
            saveBrands(brands);
        }

        if (brands.length === 0) {
            brandsTableBody.innerHTML = '<tr><td colspan="2">Aucune marque enregistrée.</td></tr>';
            return;
        }

        brands.forEach(brand => {
            const row = brandsTableBody.insertRow();
            row.innerHTML = `
                <td>${brand.name}</td>
                <td class="action-buttons">
                    <button class="btn btn-edit btn-sm" data-id="${brand.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${brand.id}" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            // Ajouter les icônes Font Awesome si ce n'est pas déjà fait dans le HTML principal
            // Assurez-vous que Font Awesome est lié dans votre HTML principal.
            // Exemple: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
        });
    }

    // Gestion des actions (édition et suppression)
    brandsTableBody.addEventListener('click', function(event) {
        const targetButton = event.target.closest('button');
        if (!targetButton) return;

        if (targetButton.classList.contains('delete-btn')) {
            const brandIdToDelete = event.target.getAttribute('data-id');
            if (!brandIdToDelete) {
                alert('ID de la marque manquant. Impossible de supprimer.');
                return;
            }

            // Vérifier si la marque est utilisée par un filament
            const filaments = JSON.parse(localStorage.getItem(FILAMENTS_DB_KEY) || '[]');
            const brandToDelete = getBrands().find(b => b.id === brandIdToDelete);

            if (!brandToDelete) {
                alert('Marque non trouvée. Impossible de supprimer.');
                return;
            }

            // Maintenant, nous vérifions brandId dans les filaments.
            const isUsed = filaments.some(f => f.brandId === brandIdToDelete);

            if (isUsed) {
                alert('Cette marque est utilisée par au moins un filament et ne peut pas être supprimée.');
                return;
            }

            if (confirm(`Êtes-vous sûr de vouloir supprimer la marque "${brandToDelete.name}" ?`)) {
                deleteBrand(brandIdToDelete);
                loadBrands(); // Recharger la liste
            }
        } else if (targetButton.classList.contains('btn-edit')) {
            const brandIdToEdit = targetButton.getAttribute('data-id');
            loadBrandForEdit(brandIdToEdit);
        }
    });

    cancelEditBrandButton.addEventListener('click', resetForm);

    function deleteBrand(brandId) {
        let brands = getBrands();
        brands = brands.filter(brand => brand.id !== brandId);
        saveBrands(brands);
    }

    function generateUniqueId() {
        return crypto.randomUUID();
    }

    function loadBrandForEdit(brandId) {
        const brands = getBrands();
        const brandToEdit = brands.find(brand => brand.id === brandId);
        if (brandToEdit) {
            brandNameInput.value = brandToEdit.name;
            editingBrandId = brandId;
            brandForm.querySelector('button[type="submit"]').textContent = 'Modifier la marque';
            cancelEditBrandButton.style.display = 'inline-block';
            brandNameInput.focus();
        }
    }

    function updateBrand(id, newName) {
        let brands = getBrands();
        // Vérifier si le nouveau nom existe déjà pour une autre marque
        if (brands.some(brand => brand.id !== id && brand.name.toLowerCase() === newName.toLowerCase())) {
            alert('Une autre marque avec ce nom existe déjà.');
            return;
        }
        const oldBrandName = brands.find(b => b.id === id)?.name;
        brands = brands.map(brand => {
            if (brand.id === id) {
                return { ...brand, name: newName };
            }
            return brand;
        });
        saveBrands(brands);

        // Mettre à jour le nom de la marque dans les filaments associés
        if (oldBrandName && oldBrandName.toLowerCase() !== newName.toLowerCase()) {
            updateBrandNameInFilaments(id, newName);
        }
    }

    function updateBrandNameInFilaments(brandId, newBrandName) {
        let filaments = JSON.parse(localStorage.getItem(FILAMENTS_DB_KEY) || '[]');
        let filamentsUpdated = false;
        filaments = filaments.map(filament => {
            if (filament.brandId === brandId) {
                // Mettre à jour le champ 'brand' si vous le conservez pour l'affichage direct
                // ou si la migration n'a pas encore supprimé ce champ.
                // filament.brand = newBrandName; // Décommentez si vous gardez filament.brand
                filamentsUpdated = true;
            }
            return filament;
        });

        if (filamentsUpdated) {
            localStorage.setItem(FILAMENTS_DB_KEY, JSON.stringify(filaments));
            // Optionnel: déclencher un événement pour que filaments_manager.js recharge si nécessaire
            // window.dispatchEvent(new CustomEvent('brandsUpdated'));
        }
    }

    function resetForm() {
        brandNameInput.value = '';
        editingBrandId = null;
        brandForm.querySelector('button[type="submit"]').textContent = 'Enregistrer la marque';
        cancelEditBrandButton.style.display = 'none';
        brandForm.reset(); // Aussi pour effacer la validation native si besoin
    }
});