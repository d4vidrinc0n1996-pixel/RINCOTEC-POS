// Database Module - Firebase Firestore Implementation
// This module provides a unified interface for database operations
// Migrated from localStorage to Firebase Firestore

const db = {
    // Simulated delay for consistency with async operations
    delay() {
        return new Promise(resolve => setTimeout(resolve, 100));
    },

    // ==================== PRODUCTS ====================

    /**
     * Get all products from Firestore
     * @returns {Promise<Array>} Array of product objects
     */
    async getAll() {
        try {
            const snapshot = await firebaseDB.collection('products').get();
            const products = [];
            snapshot.forEach(doc => {
                products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return products;
        } catch (error) {
            console.error('Error getting products:', error);
            throw new Error('Error al cargar productos');
        }
    },

    /**
     * Add a new product to Firestore
     * @param {Object} product - Product object
     * @returns {Promise<Object>} Created product with ID
     */
    async add(product) {
        try {
            const docRef = await firebaseDB.collection('products').add({
                ...product,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                id: docRef.id,
                ...product
            };
        } catch (error) {
            console.error('Error adding product:', error);
            throw new Error('Error al agregar producto');
        }
    },

    /**
     * Update an existing product
     * @param {string} id - Product ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>} Success status
     */
    async update(id, updates) {
        try {
            await firebaseDB.collection('products').doc(id).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw new Error('Error al actualizar producto');
        }
    },

    /**
     * Delete a product
     * @param {string} id - Product ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        try {
            await firebaseDB.collection('products').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw new Error('Error al eliminar producto');
        }
    },

    // ==================== SALES ====================

    /**
     * Get all sales from Firestore
     * @returns {Promise<Array>} Array of sale objects
     */
    async getSales() {
        try {
            const snapshot = await firebaseDB.collection('sales')
                .orderBy('timestamp', 'desc')
                .get();

            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamp to JavaScript Date
                    timestamp: data.timestamp?.toDate?.() || data.timestamp
                });
            });
            return sales;
        } catch (error) {
            console.error('Error getting sales:', error);
            throw new Error('Error al cargar ventas');
        }
    },

    /**
     * Add a new sale to Firestore
     * @param {Object} sale - Sale object
     * @returns {Promise<Object>} Created sale with ID
     */
    async addSale(sale) {
        try {
            const docRef = await firebaseDB.collection('sales').add({
                ...sale,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Get the created document to return with server timestamp
            const doc = await docRef.get();
            const data = doc.data();

            return {
                id: docRef.id,
                ...sale,
                timestamp: data.timestamp?.toDate?.() || new Date()
            };
        } catch (error) {
            console.error('Error adding sale:', error);

            // Check for quota exceeded (though unlikely with Firestore)
            if (error.code === 'resource-exhausted') {
                throw new Error('Límite de almacenamiento alcanzado. Contacta al administrador.');
            }

            throw new Error('Error al registrar venta');
        }
    },

    /**
     * Delete a specific sale
     * @param {string} id - Sale ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteSale(id) {
        try {
            await firebaseDB.collection('sales').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw new Error('Error al eliminar venta');
        }
    },

    /**
     * Clear all sales (use with caution!)
     * @returns {Promise<boolean>} Success status
     */
    async clearSales() {
        try {
            const snapshot = await firebaseDB.collection('sales').get();

            // Firestore doesn't support bulk delete, so we delete in batches
            const batch = firebaseDB.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error clearing sales:', error);
            throw new Error('Error al borrar historial de ventas');
        }
    },

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Get product by ID
     * @param {string} id - Product ID
     * @returns {Promise<Object|null>} Product object or null
     */
    async getProductById(id) {
        try {
            const doc = await firebaseDB.collection('products').doc(id).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting product:', error);
            return null;
        }
    },

    /**
     * Search products by name or ID
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching products
     */
    async searchProducts(query) {
        try {
            const allProducts = await this.getAll();
            const lowerQuery = query.toLowerCase();

            return allProducts.filter(product =>
                product.name.toLowerCase().includes(lowerQuery) ||
                product.id.toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    },

    /**
     * Get sales within a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Sales in date range
     */
    async getSalesByDateRange(startDate, endDate) {
        try {
            const snapshot = await firebaseDB.collection('sales')
                .where('timestamp', '>=', startDate)
                .where('timestamp', '<=', endDate)
                .orderBy('timestamp', 'desc')
                .get();

            const sales = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                sales.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.() || data.timestamp
                });
            });
            return sales;
        } catch (error) {
            console.error('Error getting sales by date:', error);
            throw new Error('Error al filtrar ventas por fecha');
        }
    },

    /**
     * Get total revenue
     * @returns {Promise<number>} Total revenue amount
     */
    async getTotalRevenue() {
        try {
            const sales = await this.getSales();
            return sales.reduce((sum, sale) => sum + sale.total, 0);
        } catch (error) {
            console.error('Error calculating revenue:', error);
            return 0;
        }
    }
};

// Export for use in other modules
window.db = db;
