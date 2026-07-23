FROM alpine:3.20

RUN apk add --no-cache bash curl jq grep findutils

RUN adduser -D -u 1000 sandboxuser

WORKDIR /sandbox

USER sandboxuser
CMD ["/bin/sh"]
