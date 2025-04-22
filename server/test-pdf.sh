#!/bin/bash

# Script para probar el procesamiento de PDF
# Uso: ./test-pdf.sh ruta/al/archivo.pdf

if [ -z "$1" ]; then
  echo "Error: Debe proporcionar la ruta a un archivo PDF"
  echo "Uso: ./test-pdf.sh ruta/al/archivo.pdf"
  exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$1" ]; then
  echo "Error: El archivo no existe: $1"
  exit 1
fi

# Ejecutar el script de prueba
echo "Ejecutando prueba de procesamiento de PDF..."
node scripts/testPDFProcessing.js "$1"
