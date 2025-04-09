require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Función para generar la configuración de índices
function generateIndexConfig() {
  try {
    console.log('Generando configuración de índices para optimizar consultas y reducir espacio...');

    // Definir los índices para cada colección
    const indexConfig = {
      // Índices para Company
      companies: [
        { key: { n: 1 }, options: { background: true } }
      ],

      // Índices para Employee
      employees: [
        { key: { n: 1 }, options: { background: true } },
        { key: { c: 1 }, options: { unique: true, background: true } },
        { key: { e: 1 }, options: { background: true } },
        { key: { a: 1 }, options: { background: true, sparse: true } }
      ],

      // Índices para Category
      categories: [
        { key: { n: 1 }, options: { unique: true, background: true } },
        { key: { a: 1 }, options: { background: true, sparse: true } }
      ],

      // Índices para Question
      questions: [
        { key: { t: "text" }, options: { background: true } },
        { key: { c: 1 }, options: { background: true } },
        { key: { a: 1 }, options: { background: true, sparse: true } }
      ],

      // Índices para Feedback
      feedbacks: [
        { key: { e: 1 }, options: { background: true } },
        { key: { c: 1 }, options: { background: true } },
        { key: { co: 1 }, options: { background: true } },
        { key: { f: 1 }, options: { background: true } },
        { key: { p: -1 }, options: { background: true } }
      ],

      // Índices para FeedbackLink
      feedbacklinks: [
        { key: { t: 1 }, options: { unique: true, background: true } },
        { key: { f: 1 }, options: { background: true } },
        { key: { e: 1 }, options: { background: true } },
        { key: { a: 1 }, options: { background: true, sparse: true } }
      ]
    };

    // Crear directorio para la configuración de índices si no existe
    const outputDir = path.join(__dirname, '../optimized_data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Guardar la configuración de índices en un archivo JSON
    const filePath = path.join(outputDir, 'index_config.json');
    fs.writeFileSync(filePath, JSON.stringify(indexConfig, null, 2));

    console.log(`✅ Configuración de índices generada y guardada en ${filePath}`);
    console.log('✅ Todos los índices han sido configurados correctamente');

    // Generar script de MongoDB para crear índices
    generateMongoScript(indexConfig, outputDir);

  } catch (error) {
    console.error('Error al generar configuración de índices:', error);
    process.exit(1);
  }
}

// Función para generar script de MongoDB para crear índices
function generateMongoScript(indexConfig, outputDir) {
  try {
    let script = '// Script para crear índices en MongoDB\n';
    script += '// Ejecutar con: mongo feedback-system create_indexes.js\n\n';

    // Añadir comandos para cada colección
    for (const [collection, indexes] of Object.entries(indexConfig)) {
      script += `// Índices para ${collection}\n`;

      for (const index of indexes) {
        const keyStr = JSON.stringify(index.key);
        const optionsStr = JSON.stringify(index.options);

        script += `db.${collection}.createIndex(${keyStr}, ${optionsStr});\n`;
      }

      script += '\n';
    }

    // Guardar el script
    const filePath = path.join(outputDir, 'create_indexes.js');
    fs.writeFileSync(filePath, script);

    console.log(`✅ Script de MongoDB para crear índices guardado en ${filePath}`);
    console.log('Para crear los índices en MongoDB, ejecuta:');
    console.log(`mongo feedback-system ${filePath}`);

  } catch (error) {
    console.error('Error al generar script de MongoDB:', error);
  }
}

// Ejecutar la función
generateIndexConfig();
