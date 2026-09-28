# Digests houden de inhoud vast, ook als een registry-tag wordt bijgewerkt.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node-runtime

# Deze officiële image bevat browsers en Linux-bibliotheken voor Playwright 1.63.0.
FROM mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27

# Gebruik dezelfde Node-runtime als lokaal; npm komt uit de vaste Playwright-image.
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
RUN test "$(node --version)" = "v24.21.0" && test "$(npm --version)" = "11.19.0"

WORKDIR /app

# Eerst alleen de pakketlijst kopiëren: Docker kan npm ci dan vaak uit de cache halen.
COPY package.json package-lock.json .npmrc ./

RUN npm ci

# Daarna pas onze tests en scripts toevoegen.
COPY . .

# Standaardcommando; de run-scripts geven bij docker run een specifiek testcommando mee.
CMD ["npx", "playwright", "test"]
