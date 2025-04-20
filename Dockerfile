FROM node:18-slim

WORKDIR /app

# Copiar todo el código fuente
COPY . .

# Instalar dependencias
RUN npm install --production
RUN cd server && npm install --production

# Configurar variables de entorno
ENV PORT=10000
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 10000

# Comando para iniciar
CMD ["node", "server/app.js"]
