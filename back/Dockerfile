FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN mkdir -p storage/article-pdfs \
             storage/doctorant-attestations \
             storage/message-attachments \
             storage/profile-photos \
             storage/purchase-attachments

EXPOSE 4000
CMD ["node", "src/server.js"]
