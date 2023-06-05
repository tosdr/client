FROM 'nginx:bullseye'
COPY . /app

WORKDIR /var/www/html

RUN cd /app && apt update && apt install -y make sudo curl && curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs && npm install --global yarn && make build

RUN cd /var/www/html && mkdir -p hypothesis/1.0.0 && mv /app/build public/hypothesis/1.0.0

RUN 