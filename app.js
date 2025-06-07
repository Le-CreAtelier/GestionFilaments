document.addEventListener('DOMContentLoaded', function() {
    // Fonction pour charger le contenu HTML dans un placeholder
    function loadHTML(url, placeholderId) {
        return fetch(url)
            .then(res => res.text())
            .then(data => {
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = data;
                }
            })
            .catch(error => console.error('Error loading HTML:', error));
    }

    const loadNav = loadHTML('nav.html', 'nav-placeholder');
    const loadFooter = loadHTML('footer.html', 'footer-placeholder');

    Promise.all([loadNav, loadFooter].filter(Boolean)).then(() => {
        // Set active link based on the current page
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.nav-links a');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();
            // Highlight 'Gestion' if on gestion.html, spools.html, or brands.html
            if (linkPage === 'gestion.html' && (currentPage === 'gestion.html' || currentPage === 'spools.html' || currentPage === 'brands.html')) {
                link.classList.add('active');
            } else if (linkPage === currentPage && linkPage !== 'spools.html' && linkPage !== 'brands.html') {
                link.classList.add('active');
            }
        });
    });
});