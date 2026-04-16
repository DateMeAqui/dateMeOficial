# 1. Definir a imagem base
FROM node:20-alpine

# 2. Definir o diretório de trabalho dentro do container
WORKDIR /app

# 3. Copiar e instalar dependências
COPY package*.json ./
# Use --omit=dev para instalar apenas dependências de produção, economizando espaço
RUN npm install --omit=dev 

# 4. Copiar o restante do código (incluindo o código-fonte)
COPY . .

# 5. PASSO CRUCIAL: Compilar o TypeScript para JavaScript (gerar a pasta dist)
RUN npx prisma generate
RUN npm run build

# 6. Expor a porta
EXPOSE 3000

# 7. Comando para iniciar o servidor (em modo de produção)
# Garante que o Node execute o arquivo JS compilado em dist/
CMD [ "npm", "run", "start:prod" ] 
# Se você só tem "start", mude para: CMD [ "npm", "start" ] se o seu "start" for o comando de produção.