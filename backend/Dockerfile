FROM node:20

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
