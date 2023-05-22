FROM 'node:buster'

EXPOSE 300

COPY . /app

WORKDIR /app

RUN yarn install && yarn build

ENTRYPOINT ["make", "dev"]