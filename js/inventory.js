let table;
let html5QrcodeScanner;
let cart = [];
let isAdmin = false;

// Categories for dropdown
const categories = {
    '🛒': 'Ventas',
    '☀️': 'Solar',
    '🖨️': 'Impresión 3D',
    '⚡': 'Servicios'
};

const subcategoriesList = [
    'Herramientas Eléctricas', 'Herramientas Manuales', 'Domótica', 'Material Eléctrico',
    'Plomería', 'Tornillería', 'Construcción', 'Componentes', 'Instalación',
    'Impresión', 'Diseño', 'General', 'Mantenimiento'
];

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    const products = await db.getAll();
    initTable(products);
    updateStatus(products.length);
});

function checkAuth() {
    isAdmin = sessionStorage.getItem('rincotec_admin') === 'true';
    const adminElements = document.querySelectorAll('.admin-only');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Note: login-btn and logout-btn might need to be added to the HTML if they don't exist
    // In the previous HTML, they weren't explicitly in the header actions, so I should add them to the HTML update.
    if (loginBtn) {
        if (isAdmin) {
            adminElements.forEach(el => el.style.display = 'inline-flex');
            loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        } else {
            adminElements.forEach(el => el.style.display = 'none');
            loginBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }
}

function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === 'admin123') {
        sessionStorage.setItem('rincotec_admin', 'true');
        location.reload();
    } else {
        alert('Credenciales incorrectas');
    }
}

function logout() {
    sessionStorage.removeItem('rincotec_admin');
    location.reload();
}

function initTable(data) {
    const inputEditor = isAdmin ? "input" : null;
    const numberEditor = isAdmin ? "number" : null;
    const listEditor = isAdmin ? "list" : null;

    table = new Tabulator("#inventory-table", {
        data: data,
        layout: "fitColumns",
        responsiveLayout: "hide",
        history: true,
        pagination: "local",
        paginationSize: 20,
        movableColumns: true,
        resizableRows: true,
        selectable: true,
        initialSort: [
            { column: "name", dir: "asc" },
        ],
        columns: [
            {
                formatter: function () { return "<i class='fas fa-plus-circle' style='color:green; cursor:pointer;'></i>"; },
                width: 40, align: "center", headerSort: false,
                cellClick: function (e, cell) { addToCart(cell.getRow().getData()); }
            },
            { title: "ID", field: "id", width: 80, headerFilter: "input" },
            { title: "Producto", field: "name", editor: inputEditor, headerFilter: "input", widthGrow: 2 },
            {
                title: "Precio", field: "price", editor: numberEditor, formatter: "money", formatterParams: {
                    symbol: "$ ", thousand: ".", precision: 0
                }, width: 100, headerFilter: "number"
            },
            {
                title: "Stock", field: "stock", editor: numberEditor, width: 80, headerFilter: "number",
                formatter: function (cell) {
                    const val = cell.getValue();
                    if (val <= 0) return `<span style="color:red; font-weight:bold;">${val}</span>`;
                    if (val < 5) return `<span style="color:orange; font-weight:bold;">${val}</span>`;
                    return val;
                }
            },
            {
                title: "Categoría", field: "category", editor: listEditor, editorParams: {
                    values: categories
                }, width: 100, headerFilter: "list", headerFilterParams: { values: categories }
            },
            { title: "Img", field: "images", editor: inputEditor, formatter: "image", formatterParams: { height: "30px" }, width: 60 }
        ],
    });

    table.on("cellEdited", function (cell) {
        if (!isAdmin) return;
        const updatedData = cell.getRow().getData();
        if (cell.getField() === "images" && typeof updatedData.images === 'string') {
            updatedData.images = [updatedData.images];
        }
        db.update(updatedData)
            .then(() => {
                cell.getElement().style.backgroundColor = "#d4edda";
                setTimeout(() => cell.getElement().style.backgroundColor = "", 500);
            })
            .catch(err => alert("Error guardando: " + err.message));
    });
}

// --- Cart Logic ---

function addToCart(product) {
    if (product.stock <= 0) {
        alert("¡Producto agotado!");
        return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        if (existingItem.qty < product.stock) {
            existingItem.qty++;
        } else {
            alert("No hay más stock disponible.");
        }
    } else {
        cart.push({ ...product, qty: 1 });
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; margin-top: 20px;">El carrito está vacío.</p>';
    } else {
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            container.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; background: white; margin-bottom: 5px; border-radius: 5px;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; font-size: 0.9rem;">${item.name}</div>
                    <div style="font-size: 0.8rem; color: #555;">$ ${item.price.toLocaleString()} x ${item.qty}</div>
                </div>
                <div style="font-weight: bold; color: var(--dark); margin-right: 10px;">$ ${itemTotal.toLocaleString()}</div>
                <button class="btn-danger" style="padding: 2px 6px; font-size: 0.8rem;" onclick="removeFromCart(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        });
    }
    document.getElementById('cart-total').innerText = `$ ${total.toLocaleString()}`;
}

async function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    // Capture Client Details
    const clientName = document.getElementById('client-name').value || "Consumidor Final";
    const clientId = document.getElementById('client-id').value || "N/A";
    const clientAddress = document.getElementById('client-address').value || "Ciudad";
    const paymentMethod = document.getElementById('payment-method').value;

    if (!confirm("¿Confirmar venta y generar factura?")) return;

    // Open window immediately to avoid popup blockers
    const invWindow = window.open('', '_blank');
    if (!invWindow) return alert("⚠️ Bloqueo de Pop-up detectado. Por favor permite ventanas emergentes para ver la factura.");
    invWindow.document.write("<h3>Generando factura... por favor espere.</h3>");

    try {
        // 1. Update Stock
        for (const item of cart) {
            const product = await db.getById(item.id);
            if (product) {
                product.stock -= item.qty;
                await db.update(product);
            }
        }

        // 2. Record Sale
        // 2. Record Sale
        const saleData = {
            items: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
            timestamp: Date.now(),
            client: {
                name: clientName,
                id: clientId,
                address: clientAddress,
                payment: paymentMethod
            }
        };
        const newSale = await db.addSale(saleData);

        // 3. Generate Invoice
        printInvoice(newSale, invWindow);

        // 4. Clear Cart & Refresh
        cart = [];
        renderCart();
        // Clear inputs
        document.getElementById('client-name').value = '';
        document.getElementById('client-id').value = '';
        document.getElementById('client-address').value = '';

        const products = await db.getAll();
        table.setData(products);

    } catch (error) {
        if (invWindow) invWindow.close();

        if (error.message.includes('Almacenamiento lleno')) {
            alert("⚠️ ALMACENAMIENTO LLENO\n\n" +
                "El navegador no tiene más espacio para guardar ventas.\n\n" +
                "SOLUCIÓN:\n" +
                "1. Haz clic en el botón 'Admin' (arriba)\n" +
                "2. Ingresa con tu usuario y contraseña\n" +
                "3. Haz clic en el botón 'Historial' (icono de basura)\n" +
                "4. Confirma que deseas borrar el historial\n" +
                "5. Intenta la venta nuevamente\n\n" +
                "NOTA: Esto borrará el historial de ventas antiguas pero NO afectará tu inventario.");
        } else {
            alert("Error en la venta: " + error.message);
        }
    }
}

function printInvoice(sale, invWindow) {
    const itemsHtml = sale.items.map(item => `
    <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.qty}</td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">$ ${item.price.toLocaleString()}</td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">$ ${(item.price * item.qty).toLocaleString()}</td>
    </tr>
`).join('');

    const template = document.getElementById('invoice-template').innerHTML;

    invWindow.document.open();
    invWindow.document.write(`
    <html>
    <head>
        <title>Factura ${sale.id.substr(0, 8)}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print {
                .no-print { display: none !important; }
            }
            .btn-print {
                background: #FECD03; border: none; padding: 10px 20px; 
                font-weight: bold; cursor: pointer; border-radius: 5px;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align: right;">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        </div>
        ${template}
    </body>
    </html>
`);

    const doc = invWindow.document;
    doc.getElementById('inv-number').innerText = sale.id.substr(0, 8).toUpperCase();
    doc.getElementById('inv-date').innerText = new Date().toLocaleDateString();

    // Fill Client Details
    doc.getElementById('inv-client').innerText = sale.client.name;
    doc.getElementById('inv-id').innerText = sale.client.id;
    doc.getElementById('inv-address').innerText = sale.client.address;
    doc.getElementById('inv-payment').innerText = sale.client.payment;

    doc.getElementById('inv-items').innerHTML = itemsHtml;

    // Calculate subtotal and IVA
    const subtotal = sale.items.reduce((sum, item) => {
        const basePrice = item.price / (1 + (item.iva || 0) / 100);
        return sum + (basePrice * item.qty);
    }, 0);
    const ivaAmount = sale.total - subtotal;

    doc.getElementById('inv-subtotal').innerText = `$ ${Math.round(subtotal).toLocaleString()}`;
    doc.getElementById('inv-iva').innerText = `$ ${Math.round(ivaAmount).toLocaleString()}`;
    doc.getElementById('inv-total').innerText = `$ ${sale.total.toLocaleString()}`;

    invWindow.document.close();

    // Wait for images to load before auto-printing
    setTimeout(() => {
        invWindow.print();
    }, 800);
}

// --- Modal & Product Logic ---

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');

    // Populate Categories
    const catSelect = document.getElementById('prod-category');
    catSelect.innerHTML = '<option value="">Seleccionar...</option>';
    for (const [key, value] of Object.entries(categories)) {
        catSelect.innerHTML += `<option value="${key}">${value} (${key})</option>`;
    }

    if (product) {
        // Edit Mode (Future implementation)
    } else {
        // New Mode
        form.reset();
        // Use db.generateUUID if available, else fallback
        if (db.generateUUID) {
            document.getElementById('prod-id').value = db.generateUUID().substr(0, 8).toUpperCase();
        } else {
            document.getElementById('prod-id').value = Date.now().toString(36).toUpperCase();
        }
    }

    updateSubcategories();
    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function updateSubcategories() {
    const subSelect = document.getElementById('prod-subcategory');
    subSelect.innerHTML = '';
    subcategoriesList.forEach(sub => {
        subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
}

function saveProduct() {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    const category = document.getElementById('prod-category').value;
    const subcategory = document.getElementById('prod-subcategory').value;
    const image = document.getElementById('prod-image').value;
    const desc = document.getElementById('prod-desc').value;
    const iva = parseFloat(document.getElementById('prod-iva').value) || 0;

    if (!name || !price || !category) {
        alert("Por favor completa los campos obligatorios (Nombre, Precio, Categoría).");
        return;
    }

    const newProduct = {
        id, name, price, stock, category, subcategory,
        images: image ? [image] : [],
        description: desc,
        iva: iva
    };

    (async () => {
        try {
            // Check if ID exists
            const existing = await db.getById(id);
            if (existing) {
                if (!confirm("El ID ya existe. ¿Sobrescribir producto?")) return;
                await db.update(newProduct);
                table.updateRow(id, newProduct);
            } else {
                await db.add(newProduct);
                table.addRow(newProduct, true);
                updateStatus(table.getDataCount() + 1);
            }
            closeProductModal();
            alert("Producto guardado exitosamente.");
        } catch (error) {
            alert("Error al guardar: " + error.message);
        }
    })();
}

// Override addProduct to open modal
function addProduct() {
    openProductModal();
}

async function deleteSelected() {
    const selectedRows = table.getSelectedRows();
    if (selectedRows.length === 0) return alert("Selecciona filas.");
    if (!confirm(`¿Eliminar ${selectedRows.length} productos?`)) return;

    for (const row of selectedRows) {
        try {
            await db.delete(row.getData().id);
            row.delete();
        } catch (error) {
            console.error(error);
        }
    }
    updateStatus(table.getDataCount());
}

function downloadCSV() {
    table.download("csv", "inventario_rincotec.csv");
}

async function clearSalesHistory() {
    if (confirm("¿Estás seguro de borrar TODO el historial de ventas? Esto liberará espacio pero no se puede deshacer.")) {
        try {
            await db.clearSales();
            alert("Historial de ventas borrado exitosamente.");
        } catch (error) {
            alert("Error al borrar historial: " + error.message);
        }
    }
}

function updateStatus(count) {
    document.getElementById('record-count').innerText = `${count} Productos`;
}

// --- Scanner Logic ---
let isModalScan = false;

function startScanner(forModal = false) {
    isModalScan = forModal;
    document.getElementById('scanner-modal').style.display = 'flex';
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function closeScanner() {
    document.getElementById('scanner-modal').style.display = 'none';
    if (html5QrcodeScanner) html5QrcodeScanner.clear();
}

function onScanSuccess(decodedText) {
    closeScanner();
    if (isModalScan) {
        document.getElementById('prod-id').value = decodedText;
    } else {
        handleScannedCode(decodedText);
    }
}

function onScanFailure(error) { }

async function handleScannedCode(code) {
    const rows = table.getRows();
    const existing = rows.find(row => row.getData().id === code);

    if (existing) {
        const product = existing.getData();
        if (confirm(`¿Agregar "${product.name}" al carrito?`)) {
            addToCart(product);
        } else {
            table.clearFilter();
            table.setFilter("id", "=", code);
        }
    } else {
        if (confirm(`Código ${code} no existe. ¿Crear nuevo?`)) {
            openProductModal();
            document.getElementById('prod-id').value = code;
        }
    }
}
