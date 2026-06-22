FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM base AS development

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM base AS build

ARG VITE_API_BASE_URL=/ui-api/v1
ARG VITE_LLM_RECOMMENDATIONS_ENABLED=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_LLM_RECOMMENDATIONS_ENABLED=$VITE_LLM_RECOMMENDATIONS_ENABLED

RUN npm run build

FROM nginx:1.29-alpine AS production

COPY nginx.http.conf.template /opt/promo-constructor/nginx/nginx.http.conf.template
COPY nginx.https.conf.template /opt/promo-constructor/nginx/nginx.https.conf.template
COPY docker-entrypoint.d/40-configure-https.sh /docker-entrypoint.d/40-configure-https.sh
RUN chmod +x /docker-entrypoint.d/40-configure-https.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
