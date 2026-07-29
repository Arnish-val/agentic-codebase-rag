FROM node:20-alpine

RUN adduser -D -u 1000 sandboxuser

WORKDIR /sandbox

USER sandboxuser
CMD ["node"]
