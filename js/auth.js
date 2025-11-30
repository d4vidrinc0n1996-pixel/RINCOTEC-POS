// Authentication Module for RINCOTEC Admin Pages
// Migrated to Firebase Authentication

(function () {
    'use strict';

    // Check if user is authenticated with Firebase
    function isAuthenticated() {
        return new Promise((resolve) => {
            // Check current auth state
            firebaseAuth.onAuthStateChanged((user) => {
                resolve(!!user);
            });
        });
    }

    // Redirect to login if not authenticated
    async function requireAuth() {
        const authenticated = await isAuthenticated();

        if (!authenticated) {
            const currentPage = window.location.pathname.split('/').pop();
            window.location.href = `admin-login.html?return=${currentPage}`;
        }
    }

    // Logout function
    window.adminLogout = async function () {
        try {
            await firebaseAuth.signOut();
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error al cerrar sesión');
        }
    };

    // Get current user
    window.getCurrentUser = function () {
        return firebaseAuth.currentUser;
    };

    // Check if user is admin (for future role-based access)
    window.isAdmin = async function () {
        const user = firebaseAuth.currentUser;
        if (!user) return false;

        // For now, all authenticated users are admins
        // In the future, you can check custom claims or Firestore roles
        return true;
    };

    // Run authentication check
    requireAuth();
})();
