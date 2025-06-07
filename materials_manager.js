// Logique pour la gestion des matières (ajout, modification, suppression)
document.addEventListener('DOMContentLoaded', function() {
    const materialForm = document.getElementById('materialForm');
    const materialNameInput = document.getElementById('materialName');
    const materialsTableBody = document.getElementById('materialsTableBody');
    const cancelEditButton = document.getElementById('cancelEditMaterial');
    let editMaterialId = null;

    // Charger les matières existantes
    loadMaterials();

    materialForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const materialName = materialNameInput.value.trim();
        if (materialName) {
            if (editMaterialId) {
                updateMaterial(editMaterialId, materialName);
            } else {
                addMaterial(materialName);
            }
            materialForm.reset();
            editMaterialId = null;
            cancelEditButton.style.display = 'none';
        } else {
            alert('Le nom de la matière ne peut pas être vide.');
        }
    });

    cancelEditButton.addEventListener('click', function() {
        materialForm.reset();
        editMaterialId = null;
        cancelEditButton.style.display = 'none';
        materialForm.querySelector('button[type="submit"]').textContent = 'Enregistrer';
    });

    function getMaterials() {
        return JSON.parse(localStorage.getItem('materials')) || [];
    }

    function saveMaterials(materials) {
        localStorage.setItem('materials', JSON.stringify(materials));
    }

    function addMaterial(name) {
        const materials = getMaterials();
        const newMaterial = {
            id: Date.now().toString(), // Simple ID unique
            name: name
        };
        materials.push(newMaterial);
        saveMaterials(materials);
        renderMaterials();
    }

    function updateMaterial(id, newName) {
        let materials = getMaterials();
        materials = materials.map(material => {
            if (material.id === id) {
                return { ...material, name: newName };
            }
            return material;
        });
        saveMaterials(materials);
        renderMaterials();
        materialForm.querySelector('button[type="submit"]').textContent = 'Enregistrer';
    }

    function deleteMaterial(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) {
            let materials = getMaterials();
            materials = materials.filter(material => material.id !== id);
            saveMaterials(materials);
            renderMaterials();
        }
    }

    function loadMaterials() {
        renderMaterials();
    }

    function renderMaterials() {
        const materials = getMaterials();
        materialsTableBody.innerHTML = ''; // Clear existing rows
        if (materials.length === 0) {
            materialsTableBody.innerHTML = '<tr><td colspan="2">Aucune matière enregistrée.</td></tr>';
            return;
        }
        materials.forEach(material => {
            const row = materialsTableBody.insertRow();
            row.insertCell().textContent = material.name;
            
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Modifier';
            editButton.classList.add('btn', 'btn-sm', 'btn-warning');
            editButton.addEventListener('click', () => {
                materialNameInput.value = material.name;
                editMaterialId = material.id;
                cancelEditButton.style.display = 'inline-block';
                materialForm.querySelector('button[type="submit"]').textContent = 'Mettre à jour';
                materialNameInput.focus();
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Supprimer';
            deleteButton.classList.add('btn', 'btn-sm', 'btn-danger');
            deleteButton.style.marginLeft = '5px';
            deleteButton.addEventListener('click', () => deleteMaterial(material.id));

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
        });
    }
});