FROM node:20-alpine
WORKDIR /app
# 依存関係を先にコピーしてキャッシュを効かせる
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci || npm install
COPY . .
EXPOSE 3000
CMD ["npm","run","dev"]
