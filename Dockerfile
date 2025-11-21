FROM nginx:stable-alpine

# COPY --from=builder /app/dist /usr/share/nginx/html
COPY dist /usr/share/nginx/html

# Nginx 설정 파일 복사 (필요한 경우)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]