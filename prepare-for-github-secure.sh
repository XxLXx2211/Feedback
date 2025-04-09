#!/bin/bash

echo "Preparando el repositorio para GitHub de forma segura..."

# Instalar Git LFS si no está instalado
if ! command -v git-lfs &> /dev/null; then
    echo "Instalando Git LFS..."
    sudo apt-get install git-lfs
    git lfs install
else
    echo "Git LFS ya está instalado."
fi

# Eliminar node_modules del seguimiento de Git
echo "Eliminando node_modules del seguimiento de Git..."
git rm --cached -r client/node_modules 2>/dev/null || true
git rm --cached -r server/node_modules 2>/dev/null || true

# Asegurarse de que .env esté ignorado para mayor seguridad
echo "Asegurando que .env esté ignorado..."
grep -q "^.env" .gitignore || echo ".env" >> .gitignore

# Eliminar .env del seguimiento de Git si ya estaba siendo seguido
echo "Eliminando .env del seguimiento de Git si ya estaba siendo seguido..."
git rm --cached .env 2>/dev/null || true

# Añadir todos los cambios
echo "Añadiendo todos los cambios..."
git add .

echo "¡Listo! Ahora puedes hacer commit y push:"
echo "git commit -m \"Preparación para despliegue en Render (modo seguro)\""
echo "git push origin main"
