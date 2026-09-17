# Deze officiële image heeft Playwright-browsers en hun Linux-bibliotheken al aan boord.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

# Eerst alleen de pakketlijst kopiëren: Docker kan npm ci dan vaak uit de cache halen.
COPY package.json package-lock.json ./

RUN npm ci

# Daarna pas onze tests en scripts toevoegen.
COPY . .

# Standaardcommando; de run-scripts geven bij docker run een specifiek testcommando mee.
CMD ["npx", "playwright", "test"]
