# Front-end estático: build com Node, servido por nginx.
# Contexto de build: src/frontend.
FROM node:24-slim AS build

WORKDIR /app

# Em produção o front fala com a API pela MESMA origem: o nginx deste container
# repassa /api para o serviço do back-end, então VITE_API_BASE_URL fica vazio.
ARG VITE_DATA_SOURCE=api
ARG VITE_API_BASE_URL=
ENV VITE_DATA_SOURCE=$VITE_DATA_SOURCE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
