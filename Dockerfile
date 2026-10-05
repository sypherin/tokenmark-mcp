# The server is one bundled file with no runtime dependencies (node >= 18 for fetch).
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY bin ./bin
USER node
ENTRYPOINT ["node", "bin/tokenmark-mcp.mjs"]
