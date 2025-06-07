document.addEventListener('DOMContentLoaded', () => {
    const colorForm = document.getElementById('colorForm');
    const colorNameInput = document.getElementById('colorName');
    const colorHexInput = document.getElementById('colorHex');
    const colorsTableBody = document.getElementById('colorsTableBody');
    const cancelEditColorButton = document.getElementById('cancelEditColor');
    let editingColorId = null; 
    const COLORS_DB_KEY = 'colorsDB';

    loadColors();

    colorForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const colorName = colorNameInput.value.trim();
        const colorHex = colorHexInput.value.trim();

        if (colorName && colorHex) {
            if (!isValidHex(colorHex)) {
                alert('Veuillez entrer un code hexadécimal valide (ex: #RRGGBB).');
                return;
            }
            if (editingColorId) {
                updateColor(editingColorId, colorName, colorHex);
            } else {
                addColor(colorName, colorHex);
            }
            resetForm();
            loadColors();
        } else {
            alert('Veuillez entrer un nom de couleur et un code hexadécimal.');
        }
    });

    function isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    function addColor(name, hex) {
        const colors = getColors();
        if (colors.some(color => color.name.toLowerCase() === name.toLowerCase() || color.hex.toLowerCase() === hex.toLowerCase())) {
            alert('Cette couleur (nom ou code hex) existe déjà.');
            return;
        }
        const newColor = {
            id: generateUniqueId(),
            name: name,
            hex: hex
        };
        colors.push(newColor);
        saveColors(colors);
    }

    function getColors() {
        return JSON.parse(localStorage.getItem(COLORS_DB_KEY) || '[]');
    }

    function saveColors(colors) {
        localStorage.setItem(COLORS_DB_KEY, JSON.stringify(colors));
    }

    function loadColors() {
        let colors = getColors();
        colorsTableBody.innerHTML = '';

        let needsSave = false;
        colors = colors.map(color => {
            if (!color.id) {
                color.id = generateUniqueId();
                needsSave = true;
            }
            return color;
        });

        if (needsSave) {
            saveColors(colors);
        }

        if (colors.length === 0) {
            colorsTableBody.innerHTML = '<tr><td colspan="4">Aucune couleur enregistrée.</td></tr>';
            return;
        }

        colors.forEach(color => {
            const row = colorsTableBody.insertRow();
            row.innerHTML = `
                <td>${color.name}</td>
                <td><div style="width: 30px; height: 30px; background-color: ${color.hex}; border: 1px solid #ccc; border-radius: 4px;"></div></td>
                <td>${color.hex}</td>
                <td class="action-buttons">
                    <button class="btn btn-edit btn-sm" data-id="${color.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${color.id}" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });
    }

    colorsTableBody.addEventListener('click', function(event) {
        const targetButton = event.target.closest('button');
        if (!targetButton) return;

        const colorId = targetButton.getAttribute('data-id');

        if (targetButton.classList.contains('delete-btn')) {
            if (!colorId) {
                alert('ID de la couleur manquant. Impossible de supprimer.');
                return;
            }
            // TODO: Vérifier si la couleur est utilisée par un filament avant de supprimer
            // Pour l'instant, suppression directe pour simplifier
            const colorToDelete = getColors().find(c => c.id === colorId);
            if (!colorToDelete) {
                alert('Couleur non trouvée. Impossible de supprimer.');
                return;
            }

            if (confirm(`Êtes-vous sûr de vouloir supprimer la couleur "${colorToDelete.name}" ?`)) {
                deleteColor(colorId);
                loadColors();
            }
        } else if (targetButton.classList.contains('btn-edit')) {
            loadColorForEdit(colorId);
        }
    });

    cancelEditColorButton.addEventListener('click', resetForm);

    function deleteColor(colorId) {
        let colors = getColors();
        colors = colors.filter(color => color.id !== colorId);
        saveColors(colors);
    }

    function generateUniqueId() {
        return crypto.randomUUID();
    }

    function loadColorForEdit(colorId) {
        const colors = getColors();
        const colorToEdit = colors.find(color => color.id === colorId);
        if (colorToEdit) {
            colorNameInput.value = colorToEdit.name;
            colorHexInput.value = colorToEdit.hex;
            editingColorId = colorId;
            colorForm.querySelector('button[type="submit"]').textContent = 'Modifier la couleur';
            cancelEditColorButton.style.display = 'inline-block';
            colorNameInput.focus();
        }
    }

    function updateColor(id, newName, newHex) {
        let colors = getColors();
        if (colors.some(color => color.id !== id && (color.name.toLowerCase() === newName.toLowerCase() || color.hex.toLowerCase() === newHex.toLowerCase()))) {
            alert('Une autre couleur avec ce nom ou ce code hexadécimal existe déjà.');
            return;
        }
        colors = colors.map(color => {
            if (color.id === id) {
                return { ...color, name: newName, hex: newHex };
            }
            return color;
        });
        saveColors(colors);
        // TODO: Mettre à jour le nom/hex de la couleur dans les filaments associés si nécessaire
    }

    function resetForm() {
        colorNameInput.value = '';
        colorHexInput.value = '';
        editingColorId = null;
        colorForm.querySelector('button[type="submit"]').textContent = 'Enregistrer la couleur';
        cancelEditColorButton.style.display = 'none';
        colorNameInput.focus();
    }
});