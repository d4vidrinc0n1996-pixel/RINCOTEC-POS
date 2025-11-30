let table;

document.addEventListener('DOMContentLoaded', async () => {
    const sales = await db.getSales();

    // Calculate Totals
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    document.getElementById('total-revenue').innerText = `$ ${totalRevenue.toLocaleString()}`;
    document.getElementById('total-transactions').innerText = sales.length;

    initTable(sales);
});

function initTable(data) {
    table = new Tabulator("#sales-table", {
        data: data,
        layout: "fitColumns",
        responsiveLayout: "hide",
        pagination: "local",
        paginationSize: 15,
        initialSort: [{ column: "timestamp", dir: "desc" }],
        columns: [
            {
                title: "Fecha", field: "timestamp", width: 180,
                formatter: function (cell) {
                    return new Date(cell.getValue()).toLocaleString();
                }
            },
            {
                title: "ID Venta", field: "id", width: 100,
                formatter: function (cell) { return cell.getValue().substr(0, 8).toUpperCase(); }
            },
            { title: "Cliente", field: "client.name", headerFilter: "input" },
            { title: "ID Cliente", field: "client.id", width: 120, headerFilter: "input" },
            { title: "Pago", field: "client.payment", width: 100 },
            {
                title: "Total", field: "total", width: 120,
                formatter: "money", formatterParams: { symbol: "$ ", thousand: ".", precision: 0 }
            },
            {
                title: "Acciones", formatter: function () {
                    return `
                        <button class='btn-primary' style='padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;'>Ver</button>
                        <button class='btn-danger delete-btn' style='padding: 4px 8px; font-size: 0.8rem;'>
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                },
                width: 140, align: "center",
                cellClick: function (e, cell) {
                    const target = e.target.closest('button');
                    if (target && target.classList.contains('delete-btn')) {
                        deleteSale(cell.getRow().getData().id);
                    } else {
                        showDetails(cell.getRow().getData());
                    }
                }
            }
        ],
    });
}

async function deleteSale(id) {
    if (confirm("¿Estás seguro de eliminar esta factura? Esta acción no se puede deshacer.")) {
        try {
            await db.deleteSale(id);
            const sales = await db.getSales();
            table.setData(sales);
            updateTotals(sales);
            alert("Factura eliminada.");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
}

async function clearSalesHistory() {
    if (confirm("¿Estás seguro de borrar TODO el historial de ventas? Esto liberará espacio pero no se puede deshacer.")) {
        try {
            await db.clearSales();
            table.setData([]);
            updateTotals([]);
            alert("Historial de ventas borrado exitosamente.");
        } catch (error) {
            alert("Error al borrar historial: " + error.message);
        }
    }
}

function updateTotals(sales) {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    document.getElementById('total-revenue').innerText = `$ ${totalRevenue.toLocaleString()}`;
    document.getElementById('total-transactions').innerText = sales.length;
}

function showDetails(sale) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-content');

    // Calculate initial values
    const subtotal = sale.items.reduce((sum, item) => {
        const basePrice = item.price / (1 + (item.iva || 0) / 100);
        return sum + (basePrice * item.qty);
    }, 0);
    const ivaAmount = sale.total - subtotal;

    let itemsHtml = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                <strong>Cliente:</strong> ${sale.client.name} (${sale.client.id})<br>
                <strong>Dirección:</strong> ${sale.client.address}<br>
                <strong>Método de Pago:</strong> ${sale.client.payment}
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #eee;">
                    <th style="text-align: left; padding: 8px;">Producto</th>
                    <th style="text-align: center; padding: 8px;">Cant.</th>
                    <th style="text-align: right; padding: 8px;">Total</th>
                </tr>
        `;

    sale.items.forEach(item => {
        itemsHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">${item.qty}</td>
                    <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">$ ${(item.price * item.qty).toLocaleString()}</td>
                </tr>
            `;
    });

    itemsHtml += `
            <tr style="background: #f9f9f9;">
                <td colspan="2" style="text-align: right; padding: 10px; font-weight: bold;">SUBTOTAL:</td>
                <td style="text-align: right; padding: 10px;">
                    <input type="number" id="edit-subtotal" value="${Math.round(subtotal)}" 
                           style="width: 120px; padding: 5px; text-align: right; border: 1px solid #ddd; border-radius: 4px;"
                           onchange="updateTotalFromSubtotal()">
                </td>
            </tr>
            <tr style="background: #f9f9f9;">
                <td colspan="2" style="text-align: right; padding: 10px; font-weight: bold;">IVA:</td>
                <td style="text-align: right; padding: 10px;">
                    <input type="number" id="edit-iva" value="${Math.round(ivaAmount)}" 
                           style="width: 120px; padding: 5px; text-align: right; border: 1px solid #ddd; border-radius: 4px;"
                           onchange="updateTotalFromIva()">
                </td>
            </tr>
            <tr style="background: #e0e0e0;">
                <td colspan="2" style="text-align: right; padding: 10px; font-weight: bold; font-size: 1.1rem;">TOTAL:</td>
                <td style="text-align: right; padding: 10px; font-weight: bold; font-size: 1.1rem;" id="edit-total-display">
                    $ ${sale.total.toLocaleString()}
                </td>
            </tr>
            </table>
            <div style="margin-top: 20px; text-align: center; display: flex; justify-content: center; gap: 10px;">
                <button class="btn-primary" onclick='printInvoiceWithCustomValues(${JSON.stringify(sale)})'>
                    <i class="fas fa-print"></i> Imprimir Factura
                </button>
                <button class="btn-danger" onclick='deleteSale("${sale.id}"); closeDetails();'>
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;

    content.innerHTML = itemsHtml;
    modal.style.display = 'flex';
}

function updateTotalFromSubtotal() {
    const subtotal = parseFloat(document.getElementById('edit-subtotal').value) || 0;
    const iva = parseFloat(document.getElementById('edit-iva').value) || 0;
    const total = subtotal + iva;
    document.getElementById('edit-total-display').innerText = `$ ${Math.round(total).toLocaleString()}`;
}

function updateTotalFromIva() {
    const subtotal = parseFloat(document.getElementById('edit-subtotal').value) || 0;
    const iva = parseFloat(document.getElementById('edit-iva').value) || 0;
    const total = subtotal + iva;
    document.getElementById('edit-total-display').innerText = `$ ${Math.round(total).toLocaleString()}`;
}

function printInvoiceWithCustomValues(sale) {
    // Get custom values from inputs
    const customSubtotal = parseFloat(document.getElementById('edit-subtotal').value) || 0;
    const customIva = parseFloat(document.getElementById('edit-iva').value) || 0;
    const customTotal = customSubtotal + customIva;

    // Create modified sale object with custom values
    const modifiedSale = {
        ...sale,
        customSubtotal: Math.round(customSubtotal),
        customIva: Math.round(customIva),
        total: Math.round(customTotal)
    };

    printInvoice(modifiedSale);
}

function printInvoice(sale) {
    // Open window immediately to avoid popup blockers
    const invWindow = window.open('', '_blank');
    if (!invWindow) return alert("⚠️ Bloqueo de Pop-up detectado. Por favor permite ventanas emergentes para ver la factura.");

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
    doc.getElementById('inv-date').innerText = new Date(sale.timestamp).toLocaleDateString();

    // Fill Client Details
    doc.getElementById('inv-client').innerText = sale.client.name;
    doc.getElementById('inv-id').innerText = sale.client.id;
    doc.getElementById('inv-address').innerText = sale.client.address;
    doc.getElementById('inv-payment').innerText = sale.client.payment;

    doc.getElementById('inv-items').innerHTML = itemsHtml;

    // Use custom values if available, otherwise calculate
    let subtotal, ivaAmount;
    if (sale.customSubtotal !== undefined && sale.customIva !== undefined) {
        subtotal = sale.customSubtotal;
        ivaAmount = sale.customIva;
    } else {
        subtotal = sale.items.reduce((sum, item) => {
            const basePrice = item.price / (1 + (item.iva || 0) / 100);
            return sum + (basePrice * item.qty);
        }, 0);
        ivaAmount = sale.total - subtotal;
    }

    doc.getElementById('inv-subtotal').innerText = `$ ${Math.round(subtotal).toLocaleString()}`;
    doc.getElementById('inv-iva').innerText = `$ ${Math.round(ivaAmount).toLocaleString()}`;
    doc.getElementById('inv-total').innerText = `$ ${sale.total.toLocaleString()}`;

    invWindow.document.close();

    // Wait for images to load before auto-printing
    setTimeout(() => {
        invWindow.print();
    }, 800);
}

function closeDetails() {
    document.getElementById('details-modal').style.display = 'none';
}
