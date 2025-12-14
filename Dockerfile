# SafeBite API Gateway Dockerfile (API only)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
ENV PORT=8000
EXPOSE 8000
CMD ["npm", "run", "api"]
