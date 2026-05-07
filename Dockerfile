# 使用 Node.js 20 镜像
FROM node:20-slim AS builder

WORKDIR /app

# 复制依赖配置
COPY package*.json ./
RUN npm install

# 复制源代码并构建
COPY . .
RUN npm run build

# 运行阶段
FROM node:20-slim

WORKDIR /app

# 只复制构建产物和必要的 Node.js 文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
# 如果 server.ts 使用了 TypeScript，生产环境建议编译后运行，或者在生产环境安装 tsx
RUN npm install --omit=dev && npm install -g tsx

# 开放端口
EXPOSE 3000

# 启动命令
CMD ["tsx", "server.ts"]
