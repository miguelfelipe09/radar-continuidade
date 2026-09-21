# A URL da API é embutida no bundle em tempo de build, porque o Vite resolve
# import.meta.env na compilação. Quem roda em outro host passa
# --build-arg VITE_API_URL=...
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# O resultado do build é HTML, CSS e JS estáticos: não precisa de Node nem do
# Vite em tempo de execução. A tentativa anterior servia com `vite preview`,
# que depende de pacotes de desenvolvimento removidos pelo `npm ci --omit=dev`
# e quebrava o container em laço.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4173
