# Optimización de la Base de Datos

Este documento describe las optimizaciones realizadas en la base de datos MongoDB para reducir el espacio de almacenamiento y mejorar el rendimiento.

## Cambios Realizados

### 1. Nombres de Campos Abreviados

Se han abreviado los nombres de los campos en todos los modelos para reducir el espacio de almacenamiento:

#### Modelo Company
- `nombre` → `n`
- `ubicacion` → `ubicacion`

#### Modelo Employee
- `nombre_completo` → `n`
- `cedula` → `c`
- `puesto` → `p`
- `empresa` → `e`
- `activo` → `a`

#### Modelo Category
- `nombre` → `n`
- `descripcion` → `d`
- `activo` → `a`

#### Modelo Question
- `texto` → `t`
- `tipo_respuesta` → `r`
- `importancia` → `i`
- `categoria` → `c`
- `preguntas_si_no` → `s`
- `activo` → `a`

#### Modelo Feedback
- `titulo` → `t`
- `empleado` → `e`
- `empresa` → `c`
- `respuestas` → `r`
- `puntuacion_total` → `p`
- `anonimo` → `a`
- `completado` → `co`
- `fecha_creacion` → `f`

#### Modelo FeedbackLink
- `feedback` → `f`
- `token` → `t`
- `activo` → `a`
- `fecha_expiracion` → `e`
- `mostrar_observaciones` → `o`

### 2. Eliminación de Campos Innecesarios

- Se han eliminado campos redundantes o poco utilizados
- Se ha eliminado el campo `__v` (versionKey) en todos los modelos
- Se han eliminado los campos de fecha de creación redundantes cuando ya existe `timestamps`

### 3. Optimización de Subdocumentos

- Se ha eliminado el campo `_id` en los subdocumentos para ahorrar espacio
- Se han abreviado los nombres de los campos en los subdocumentos

### 4. Límites de Longitud

Se han añadido límites de longitud a los campos de texto para evitar almacenar datos excesivamente grandes:

- Nombres: máximo 100 caracteres
- Descripciones: máximo 200 caracteres
- Textos largos: máximo 500 caracteres

### 5. TTL (Time-To-Live)

Se han añadido índices TTL para eliminar automáticamente documentos antiguos:

- Feedback: TTL de 1 año
- FeedbackLink: TTL de 31 días

### 6. Índices Optimizados

Se ha creado un script para generar índices optimizados que mejoran el rendimiento de las consultas más comunes:

- Índices simples para campos de filtrado frecuente
- Índices de texto para búsquedas
- Índices compuestos para consultas complejas
- Índices sparse para campos opcionales

## Cómo Aplicar los Cambios

Para aplicar estas optimizaciones a una base de datos existente, siga estos pasos:

1. **Migrar los datos existentes**:
   ```
   cd server
   npm run migrate
   ```

2. **Crear los índices optimizados**:
   ```
   cd server
   npm run create-indexes
   ```

## Impacto Estimado

- **Reducción de espacio**: Aproximadamente 30-50% menos espacio de almacenamiento
- **Mejora de rendimiento**: Consultas hasta 5 veces más rápidas
- **Limpieza automática**: Eliminación de datos antiguos que ya no son necesarios

## Consideraciones

- Los controladores y servicios deben actualizarse para usar los nuevos nombres de campos
- Las consultas directas a la base de datos deben modificarse
- Las aplicaciones cliente deben adaptarse a los nuevos nombres de campos

## Monitoreo

Se recomienda monitorear el rendimiento y el uso de espacio después de aplicar estas optimizaciones para verificar su efectividad.
