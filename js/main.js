// State
let allProducts = [];
let currentCategory = 'Todos';
let currentSubcategory = 'Todos';

// Subcategory Definitions
const subcategories = {
    '🛒': ['Herramientas Eléctricas', 'Herramientas Manuales', 'Domótica', 'Material Eléctrico', 'Plomería', 'Tornillería', 'Construcción'],
    '☀️': ['Componentes', 'Instalación'],
    '🖨️': ['Impresión', 'Diseño', 'General'],
    '⚡': ['Mantenimiento', 'Instalación', 'General']
};

// DOM Elements
const grid = document.getElementById('product-grid');
const filterBtns = document.querySelectorAll('#products .filter-btn');
const subFiltersContainer = document.getElementById('subcategories');

// Initialize
async function initApp() {
    try {
        allProducts = await db.getAll();
        renderProducts(allProducts);
    } catch (error) {
        console.error("Failed to load products:", error);
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error cargando productos.</p>';
    }
}

// Render Products
function renderProducts(products) {
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 50px;">No hay productos en esta categoría.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        // Image handling
        let imagesHtml = '';
        if (product.images && product.images.length > 0) {
            imagesHtml = `<img src="${product.images[0]}" class="slide-img active" alt="${product.name}">`;
            // Add hidden images for slideshow
            for (let i = 1; i < product.images.length; i++) {
                imagesHtml += `<img src="${product.images[i]}" class="slide-img" alt="${product.name}">`;
            }
        } else {
            imagesHtml = `<img src="https://via.placeholder.com/300x200?text=No+Image" alt="No Image">`;
        }

        // Stock Logic
        let stockHtml = '';
        let isOutOfStock = false;

        if (product.stock !== undefined) {
            if (product.stock <= 0) {
                isOutOfStock = true;
                stockHtml = '<span class="badge bg-danger" style="position:absolute; top:10px; right:10px; z-index:2; background:red; color:white; padding:5px; border-radius:5px; font-size:0.8rem;">Agotado</span>';
            } else if (product.stock < 5) {
                stockHtml = `<span class="badge bg-warning text-dark" style="position:absolute; top:10px; right:10px; z-index:2; background:orange; color:black; padding:5px; border-radius:5px; font-size:0.8rem;">¡Solo quedan ${product.stock}!</span>`;
            }
        }

        // Button Logic
        let btnHtml = '';
        if (isOutOfStock) {
            btnHtml = `<button class="action-btn" style="background-color: #ccc; cursor: not-allowed;" disabled>
                        <i class="fas fa-ban"></i> Agotado
                       </button>`;
        } else if (product.mlLink) {
            btnHtml = `<a href="${product.mlLink}" target="_blank" class="action-btn btn-ml">
                        <i class="fas fa-shopping-cart"></i> Comprar en ML
                       </a>`;
        } else {
            const msg = `Hola, me interesa el producto: ${product.name} (ID: ${product.id})`;
            const waLink = `https://wa.me/573057617619?text=${encodeURIComponent(msg)}`;
            btnHtml = `<a href="${waLink}" target="_blank" class="action-btn btn-whatsapp">
                        <i class="fab fa-whatsapp"></i> Pedir por WhatsApp
                       </a>`;
        }

        // Price formatting
        const priceFormatted = product.price > 0
            ? `$ ${product.price.toLocaleString()}`
            : 'Cotizar';

        card.innerHTML = `
            ${stockHtml}
            <div class="img-container" 
                 onmouseenter="startSlideshow(this)" 
                 onmouseleave="stopSlideshow(this)">
                ${imagesHtml}
            </div>
            <div class="product-info">
                <span class="product-category">${product.category} ${product.subcategory ? ' | ' + product.subcategory : ''}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${priceFormatted}</div>
                ${btnHtml}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Filter Function
function filterProducts(category) {
    currentCategory = category;
    currentSubcategory = 'Todos'; // Reset subcategory

    // Update Main Buttons
    filterBtns.forEach(btn => {
        if (btn.innerText.includes(category) || (category === 'Todos' && btn.innerText === 'Todos')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Handle Subcategories
    updateSubcategoryUI(category);

    // Filter Data
    applyFilters();
}

function updateSubcategoryUI(category) {
    subFiltersContainer.innerHTML = '';
    subFiltersContainer.style.display = 'none';

    if (category !== 'Todos' && subcategories[category]) {
        subFiltersContainer.style.display = 'block';

        // "Todos" option for subcategories
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.innerText = 'Todos';
        allBtn.onclick = () => filterSubcategory('Todos', allBtn);
        subFiltersContainer.appendChild(allBtn);

        subcategories[category].forEach(sub => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = sub;
            btn.onclick = () => filterSubcategory(sub, btn);
            subFiltersContainer.appendChild(btn);
        });
    }
}

function filterSubcategory(sub, clickedBtn) {
    currentSubcategory = sub;

    // Update UI
    const btns = subFiltersContainer.querySelectorAll('.filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');

    applyFilters();
}

function applyFilters() {
    let filtered = allProducts;

    if (currentCategory !== 'Todos') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (currentSubcategory !== 'Todos') {
        filtered = filtered.filter(p => p.subcategory === currentSubcategory);
    }

    renderProducts(filtered);
}

// Slideshow Logic
let intervals = new Map();

function startSlideshow(container) {
    const images = container.querySelectorAll('img');
    if (images.length <= 1) return;

    let currentIndex = 0;
    // Find current active
    images.forEach((img, idx) => {
        if (img.classList.contains('active')) currentIndex = idx;
    });

    const intervalId = setInterval(() => {
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex].classList.add('active');
    }, 3000); // Change every 3s

    intervals.set(container, intervalId);
}

function stopSlideshow(container) {
    if (intervals.has(container)) {
        clearInterval(intervals.get(container));
        intervals.delete(container);
    }
    // Reset to first image
    const images = container.querySelectorAll('img');
    if (images.length > 0) {
        images.forEach(img => img.classList.remove('active'));
        images[0].classList.add('active');
    }
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
