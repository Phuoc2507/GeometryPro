# Bước 1: Build ứng dụng React (Frontend)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Chạy lệnh build Vite
RUN npm run build

# Bước 2: Chạy Server (Express/Node.js) để phục vụ Frontend và Backend API
FROM node:18-alpine

WORKDIR /app

# Copy file build từ bước 1
COPY --from=builder /app/dist ./dist

# Copy file server và các API
COPY server.js ./
COPY api ./api
COPY package*.json ./

# Cài đặt dependencies chỉ cho môi trường production
RUN npm ci --omit=dev

# Mở port 3000
EXPOSE 3000

# Chạy lệnh start server
CMD ["node", "server.js"]
