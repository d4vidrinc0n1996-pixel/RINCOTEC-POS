# RINCOTEC - Sistema POS

Sistema de Punto de Venta (POS) para RINCOTEC - Ingeniería y Ferretería Técnica.

## 🚀 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Authentication
- **Hosting**: Netlify
- **Librerías**:
  - Tabulator.js (tablas interactivas)
  - HTML5-QRCode (escaneo de códigos)
  - Font Awesome (iconos)

## 📋 Características

- ✅ Gestión de inventario con categorías y subcategorías
- ✅ Sistema de ventas con carrito
- ✅ Generación de facturas con desglose de IVA
- ✅ Historial de ventas con búsqueda y filtros
- ✅ Escaneo de códigos de barras
- ✅ Autenticación de administrador
- ✅ Exportación de datos a CSV
- ✅ Diseño responsive

## 🛠️ Desarrollo Local

### Requisitos
- Navegador web moderno
- Servidor HTTP local (recomendado: Live Server de VS Code)

### Instalación
1. Clona el repositorio
2. Configura Firebase (ver [DEPLOYMENT.md](DEPLOYMENT.md))
3. Copia `.env.example` a `.env` y completa las credenciales
4. Abre con Live Server o cualquier servidor HTTP local

### Estructura del Proyecto
```
Pagina/
├── css/
│   └── styles.css          # Estilos globales
├── js/
│   ├── firebase-config.js  # Configuración de Firebase
│   ├── db.js              # Capa de acceso a datos
│   ├── auth.js            # Autenticación
│   ├── main.js            # Lógica página principal
│   ├── inventory.js       # Lógica de inventario
│   └── sales.js           # Lógica de ventas
├── index.html             # Página principal
├── inventory.html         # Gestión de inventario
├── sales.html             # Historial de ventas
├── admin-login.html       # Login administrativo
└── netlify.toml           # Configuración de Netlify
```

## 🚀 Despliegue

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas de despliegue en Netlify.

## 🔐 Credenciales por Defecto

**Usuario Admin**: admin@rincotec.com  
**Contraseña**: (configurar en Firebase Authentication)

> ⚠️ **IMPORTANTE**: Cambia las credenciales después del primer despliegue.

## 📝 Licencia

© 2024 RINCOTEC Ingeniería. Todos los derechos reservados.
