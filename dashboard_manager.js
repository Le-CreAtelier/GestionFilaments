// js/dashboard_manager.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Tableau de bord chargé.");

    function loadDashboardData() {
        const totalSpools = localStorage.getItem('totalSpoolsCount') || 'N/A';
        const stockValue = parseFloat(localStorage.getItem('totalStockValueAmount') || 0).toFixed(2) + '€';
        const materialsCount = localStorage.getItem('uniqueMaterialsCount') || 'N/A';
        const lowStockCount = localStorage.getItem('lowStockItemsCount') || 'N/A';

        // Mettre à jour les cartes du tableau de bord
        document.getElementById('dbTotalSpools').textContent = totalSpools;
        document.getElementById('dbStockValue').textContent = stockValue;
        document.getElementById('dbMaterialsCount').textContent = materialsCount;
        document.getElementById('dbLowStockCount').textContent = lowStockCount;

        // Données pour les statistiques détaillées (exemples, à développer)
        const filaments = JSON.parse(localStorage.getItem('filamentsDB')) || [];
        if (filaments.length > 0) {
            const totalWeightAll = filaments.reduce((sum, f) => sum + (parseInt(f.remainingWeight) || 0), 0);
            document.getElementById('dbTotalWeightAll').textContent = totalWeightAll;

            const avgWeightPerSpool = totalWeightAll / filaments.length;
            document.getElementById('dbAvgWeightPerSpool').textContent = avgWeightPerSpool.toFixed(0);

            // Couleur la plus fréquente (exemple simple)
            const colorCounts = filaments.reduce((acc, f) => {
                acc[f.color] = (acc[f.color] || 0) + 1;
                return acc;
            }, {});
            let mostFrequentColor = 'N/A';
            let maxCount = 0;
            for (const color in colorCounts) {
                if (colorCounts[color] > maxCount) {
                    mostFrequentColor = color;
                    maxCount = colorCounts[color];
                }
            }
            document.getElementById('dbMostFrequentColor').textContent = mostFrequentColor;

        } else {
            document.getElementById('dbTotalWeightAll').textContent = '0';
            document.getElementById('dbAvgWeightPerSpool').textContent = '0';
            document.getElementById('dbMostFrequentColor').textContent = 'N/A';
        }
    }

    function getMaterialDistributionData(filaments) {
        const materialCounts = {};
        filaments.forEach(f => {
            const mat = f.material || 'Inconnu';
            materialCounts[mat] = (materialCounts[mat] || 0) + 1;
        });
        return {
            labels: Object.keys(materialCounts),
            values: Object.values(materialCounts)
        };
    }

    function getStockTrendData(filaments) {
        // Pour la démo, on regroupe par mois d'achat (format AAAA-MM)
        const trend = {};
        filaments.forEach(f => {
            if (f.purchaseDate) {
                const month = f.purchaseDate.slice(0,7); // "2024-06"
                trend[month] = (trend[month] || 0) + (parseInt(f.remainingWeight) || 0);
            }
        });
        const sortedMonths = Object.keys(trend).sort();
        return {
            labels: sortedMonths,
            values: sortedMonths.map(m => trend[m])
        };
    }

    loadDashboardData();

    // --- Graphiques dynamiques ---
    function updateCharts() {
        const filaments = JSON.parse(localStorage.getItem('filamentsDB')) || [];
        renderMaterialDistributionChart(getMaterialDistributionData(filaments));
        renderStockTrendChart(getStockTrendData(filaments));
    }
    updateCharts();
    window.addEventListener('storage', updateCharts); // Met à jour les graphiques si localStorage change dans un autre onglet

    // --- Initialisation des graphiques ---
    function renderMaterialDistributionChart(data) {
        const ctx = document.getElementById('materialDistributionChart').getContext('2d');
        if (window.materialChartInstance) window.materialChartInstance.destroy();
        window.materialChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Répartition des matériaux' }
                }
            }
        });
    }

    function renderStockTrendChart(data) {
        const ctx = document.getElementById('stockTrendChart').getContext('2d');
        if (window.stockTrendChartInstance) window.stockTrendChartInstance.destroy();
        window.stockTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Stock total (g)',
                    data: data.values,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Tendance du stock' }
                }
            }
        });
    }


});
