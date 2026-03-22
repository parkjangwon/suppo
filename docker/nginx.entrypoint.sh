#!/bin/sh
set -eu

extract_host() {
  value="$1"
  if [ -z "$value" ]; then
    return 1
  fi

  printf "%s" "$value" | sed -E 's#^[A-Za-z]+://([^/:]+).*#\1#'
}

PUBLIC_SERVER_NAME="${PUBLIC_SERVER_NAME:-}"
ADMIN_SERVER_NAME="${ADMIN_SERVER_NAME:-}"

if [ -z "$PUBLIC_SERVER_NAME" ]; then
  PUBLIC_SERVER_NAME="$(extract_host "${PUBLIC_URL:-}")"
fi

if [ -z "$ADMIN_SERVER_NAME" ]; then
  ADMIN_SERVER_NAME="$(extract_host "${ADMIN_URL:-}")"
fi

if [ -z "$PUBLIC_SERVER_NAME" ] || [ -z "$ADMIN_SERVER_NAME" ]; then
  echo "PUBLIC_SERVER_NAME 또는 ADMIN_SERVER_NAME을 결정할 수 없습니다." >&2
  echo "PUBLIC_URL/ADMIN_URL 또는 PUBLIC_SERVER_NAME/ADMIN_SERVER_NAME을 설정하세요." >&2
  exit 1
fi

NGINX_HTTP_PORT="${NGINX_HTTP_PORT:-80}"
NGINX_HTTPS_PORT="${NGINX_HTTPS_PORT:-443}"
PUBLIC_CLIENT_MAX_BODY_SIZE="${PUBLIC_CLIENT_MAX_BODY_SIZE:-600M}"
ADMIN_CLIENT_MAX_BODY_SIZE="${ADMIN_CLIENT_MAX_BODY_SIZE:-100M}"
ENABLE_TLS="${ENABLE_TLS:-0}"

PUBLIC_TLS_CERT="${PUBLIC_TLS_CERT:-/etc/nginx/certs/public.crt}"
PUBLIC_TLS_KEY="${PUBLIC_TLS_KEY:-/etc/nginx/certs/public.key}"
ADMIN_TLS_CERT="${ADMIN_TLS_CERT:-/etc/nginx/certs/admin.crt}"
ADMIN_TLS_KEY="${ADMIN_TLS_KEY:-/etc/nginx/certs/admin.key}"

HTTPS_REDIRECT_SUFFIX=""
if [ "$NGINX_HTTPS_PORT" != "443" ]; then
  HTTPS_REDIRECT_SUFFIX=":$NGINX_HTTPS_PORT"
fi

cat > /etc/nginx/nginx.conf <<EOF
events {
    worker_connections 1024;
}

http {
    upstream public_app {
        server public:3000;
    }

    upstream admin_app {
        server admin:3000;
    }
EOF

if [ "$ENABLE_TLS" = "1" ] || [ "$ENABLE_TLS" = "true" ] || [ "$ENABLE_TLS" = "yes" ]; then
  cat >> /etc/nginx/nginx.conf <<EOF

    server {
        listen ${NGINX_HTTP_PORT};
        server_name ${PUBLIC_SERVER_NAME};
        return 301 https://\$host${HTTPS_REDIRECT_SUFFIX}\$request_uri;
    }

    server {
        listen ${NGINX_HTTP_PORT};
        server_name ${ADMIN_SERVER_NAME};
        return 301 https://\$host${HTTPS_REDIRECT_SUFFIX}\$request_uri;
    }

    server {
        listen ${NGINX_HTTPS_PORT} ssl;
        server_name ${PUBLIC_SERVER_NAME};

        ssl_certificate ${PUBLIC_TLS_CERT};
        ssl_certificate_key ${PUBLIC_TLS_KEY};

        location / {
            proxy_pass         http://public_app;
            proxy_set_header   Host \$host;
            proxy_set_header   X-Real-IP \$remote_addr;
            proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto \$scheme;
            proxy_set_header   X-Forwarded-Host \$host;
            client_max_body_size ${PUBLIC_CLIENT_MAX_BODY_SIZE};
        }
    }

    server {
        listen ${NGINX_HTTPS_PORT} ssl;
        server_name ${ADMIN_SERVER_NAME};

        ssl_certificate ${ADMIN_TLS_CERT};
        ssl_certificate_key ${ADMIN_TLS_KEY};

        location = / {
            return 301 /admin/dashboard;
        }

        location / {
            proxy_pass         http://admin_app;
            proxy_set_header   Host \$host;
            proxy_set_header   X-Real-IP \$remote_addr;
            proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto \$scheme;
            proxy_set_header   X-Forwarded-Host \$host;
            client_max_body_size ${ADMIN_CLIENT_MAX_BODY_SIZE};
        }
    }
EOF
else
  cat >> /etc/nginx/nginx.conf <<EOF

    server {
        listen ${NGINX_HTTP_PORT};
        server_name ${PUBLIC_SERVER_NAME};

        location / {
            proxy_pass         http://public_app;
            proxy_set_header   Host \$host;
            proxy_set_header   X-Real-IP \$remote_addr;
            proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto \$scheme;
            proxy_set_header   X-Forwarded-Host \$host;
            client_max_body_size ${PUBLIC_CLIENT_MAX_BODY_SIZE};
        }
    }

    server {
        listen ${NGINX_HTTP_PORT};
        server_name ${ADMIN_SERVER_NAME};

        location = / {
            return 301 /admin/dashboard;
        }

        location / {
            proxy_pass         http://admin_app;
            proxy_set_header   Host \$host;
            proxy_set_header   X-Real-IP \$remote_addr;
            proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto \$scheme;
            proxy_set_header   X-Forwarded-Host \$host;
            client_max_body_size ${ADMIN_CLIENT_MAX_BODY_SIZE};
        }
    }
EOF
fi

cat >> /etc/nginx/nginx.conf <<EOF
}
EOF

exec nginx -g 'daemon off;'
