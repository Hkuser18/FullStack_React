# ── Build ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Requests are proxied same-origin via nginx.conf, so the client talks to a
# relative /api path - no build-time API URL needed.
ENV VITE_USE_SERVER=true
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
