document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('spoolTypeForm');
    const nameInput = document.getElementById('spoolTypeName');
    const weightInput = document.getElementById('spoolTypeWeight');
    const tableBody = document.querySelector('#spoolTypesTable tbody');

    function loadSpoolTypes() {
        let types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
        let needsSave = false;
        // Migration: Assigner des IDs aux types existants qui n'en ont pas
        types = types.map(type => {
            if (!type.id) {
                type.id = crypto.randomUUID();
                needsSave = true;
            }
            return type;
        });

        if (needsSave) {
            saveSpoolTypes(types);
        }

        tableBody.innerHTML = '';
        types.forEach((type) => {
            const row = document.createElement('tr');
            // type.id devrait toujours exister maintenant grâce à la migration
            row.innerHTML = `<td>${type.name}</td><td>${type.weight}</td><td><button data-id="${type.id}" class="edit-btn btn btn-secondary">Modifier</button> <button data-id="${type.id}" class="delete-btn btn btn-danger">Supprimer</button></td>`;
            tableBody.appendChild(row);
        });
    }

    function saveSpoolTypes(types) {
        localStorage.setItem('spoolTypes', JSON.stringify(types));
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = nameInput.value.trim();
        const weight = parseInt(weightInput.value, 10);
        if (!name || isNaN(weight) || weight < 1) return;
        const types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
        const editingId = nameInput.dataset.editingId;
        if (editingId) {
            // Mode édition
            let types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
            types = types.map(type => {
                if (type.id === editingId) {
                    return { ...type, name: name, weight: weight };
                }
                return type;
            });
            saveSpoolTypes(types);
            form.querySelector('button[type="submit"]').textContent = 'Ajouter'; // Rétablir le texte du bouton
        } else {
            // Mode ajout
            const newSpoolType = {
            id: crypto.randomUUID(),
            name: name,
            weight: weight
        };
        types.push(newSpoolType);
        saveSpoolTypes(types);
        }
        loadSpoolTypes();
        form.reset();
        nameInput.dataset.editingId = ''; // Réinitialiser l'ID d'édition
    });

    tableBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-btn')) {
            const spoolTypeIdToEdit = e.target.getAttribute('data-id');
            const types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
            const typeToEdit = types.find(t => t.id === spoolTypeIdToEdit);
            if (typeToEdit) {
                nameInput.value = typeToEdit.name;
                weightInput.value = typeToEdit.weight;
                nameInput.dataset.editingId = typeToEdit.id; // Stocker l'ID pour la soumission
                form.querySelector('button[type="submit"]').textContent = 'Modifier';
            }
        } else if (e.target.classList.contains('delete-btn')) {
            const spoolTypeIdToDelete = e.target.getAttribute('data-id');
            if (!spoolTypeIdToDelete) {
                alert("Impossible de supprimer : ID du type de bobine manquant.");
                return;
            }

            let types = JSON.parse(localStorage.getItem('spoolTypes') || '[]');
            const typeToDelete = types.find(t => t.id === spoolTypeIdToDelete);

            if (!typeToDelete) {
                alert("Type de bobine non trouvé.");
                return;
            }

            // --- AJOUT : Vérification d'utilisation ---
            const filaments = JSON.parse(localStorage.getItem('filamentsDB') || '[]');
            // Note: f.spoolTypeId sera la nouvelle clé dans l'objet filament.
            // Pour l'instant, si les filaments utilisent encore f.spoolType (le nom), cette vérification ne sera pas précise.
            // Il faudra migrer les données existantes ou adapter temporairement la vérification.
            // Vérification d'utilisation améliorée pour prendre en compte les anciens filaments (par nom) et les nouveaux (par ID)
            const isUsed = filaments.some(f => 
                (f.spoolTypeId && f.spoolTypeId === typeToDelete.id) || 
                (!f.spoolTypeId && f.spoolType && f.spoolType === typeToDelete.name) // Vérifie par nom si spoolTypeId n'existe pas
            );

            if (isUsed) {
                alert(`Le type "${typeToDelete.name}" (ID: ${spoolTypeIdToDelete}) est utilisé par au moins un filament et ne peut pas être supprimé.`);
                return; // Bloque la suppression
            }
            // --- FIN DE L'AJOUT ---

            types = types.filter(type => type.id !== spoolTypeIdToDelete);
            saveSpoolTypes(types);
            loadSpoolTypes();
        }
    });

    loadSpoolTypes();
});