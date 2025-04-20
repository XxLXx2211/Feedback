FROM node:18-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar dependencias con --legacy-peer-deps para evitar problemas de compatibilidad
RUN npm install --production --legacy-peer-deps
WORKDIR /app/server
RUN npm install --production --legacy-peer-deps
WORKDIR /app

# Copiar el resto de archivos
COPY . .

# Configurar variables de entorno
ENV PORT=8080
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8080

# Comando para iniciar
CMD ["node", "server/app.js"]
