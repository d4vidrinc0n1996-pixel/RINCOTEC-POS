# 🚀 Script de Despliegue Rápido - RINCOTEC
# Este script te ayudará a desplegar tu sitio en Netlify

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RINCOTEC - Despliegue Automático" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Git está instalado
Write-Host "✓ Verificando Git..." -ForegroundColor Green
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git no está instalado. Por favor instala Git primero:" -ForegroundColor Red
    Write-Host "   https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Git encontrado" -ForegroundColor Green
Write-Host ""

# Inicializar Git si no existe
if (!(Test-Path ".git")) {
    Write-Host "📦 Inicializando repositorio Git..." -ForegroundColor Cyan
    git init
    Write-Host "✓ Repositorio inicializado" -ForegroundColor Green
} else {
    Write-Host "✓ Repositorio Git ya existe" -ForegroundColor Green
}

Write-Host ""

# Agregar archivos
Write-Host "📝 Agregando archivos al repositorio..." -ForegroundColor Cyan
git add .
Write-Host "✓ Archivos agregados" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "💾 Creando commit..." -ForegroundColor Cyan
git commit -m "Deploy: RINCOTEC Website"
Write-Host "✓ Commit creado" -ForegroundColor Green
Write-Host ""

# Instrucciones para GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIGUIENTE PASO: GitHub" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a: https://github.com/new" -ForegroundColor White
Write-Host "2. Nombre del repositorio: rincotec-website" -ForegroundColor White
Write-Host "3. Visibilidad: Privado" -ForegroundColor White
Write-Host "4. NO marques ninguna opción adicional" -ForegroundColor White
Write-Host "5. Haz clic en 'Create repository'" -ForegroundColor White
Write-Host ""

# Pedir URL del repositorio
Write-Host "Ingresa la URL de tu repositorio de GitHub:" -ForegroundColor Yellow
Write-Host "(Ejemplo: https://github.com/tu-usuario/rincotec-website.git)" -ForegroundColor Gray
$repoUrl = Read-Host "URL"

if ($repoUrl) {
    Write-Host ""
    Write-Host "📤 Configurando repositorio remoto..." -ForegroundColor Cyan
    
    # Remover origin si existe
    git remote remove origin 2>$null
    
    # Agregar nuevo origin
    git remote add origin $repoUrl
    git branch -M main
    
    Write-Host "✓ Repositorio configurado" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🚀 Subiendo código a GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Código subido exitosamente" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  SIGUIENTE PASO: Netlify" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Ve a: https://app.netlify.com/" -ForegroundColor White
        Write-Host "2. Haz clic en 'Add new site' → 'Import an existing project'" -ForegroundColor White
        Write-Host "3. Selecciona 'GitHub'" -ForegroundColor White
        Write-Host "4. Selecciona el repositorio 'rincotec-website'" -ForegroundColor White
        Write-Host "5. Build command: (dejar vacío)" -ForegroundColor White
        Write-Host "6. Publish directory: . (punto)" -ForegroundColor White
        Write-Host "7. Haz clic en 'Deploy site'" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 ¡Tu sitio estará en línea en 1-2 minutos!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al subir el código" -ForegroundColor Red
        Write-Host "Verifica que hayas creado el repositorio en GitHub" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⚠️  No se ingresó URL. Puedes subir manualmente con:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "git remote add origin TU_URL_AQUI" -ForegroundColor Gray
    Write-Host "git branch -M main" -ForegroundColor Gray
    Write-Host "git push -u origin main" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Script completado" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
