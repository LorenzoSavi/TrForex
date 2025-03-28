#!/bin/sh

# Controlla se Docker è installato
if ! command -v docker >/dev/null 2>&1; then
    echo "Errore: Docker non è installato o non è nel PATH"
    echo "Installa Docker da https://docs.docker.com/get-docker/"
    exit 1
fi

# Controlla se docker-compose o il plugin docker compose è disponibile
DOCKER_COMPOSE_CMD=""
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "Errore: Né docker-compose né il plugin docker compose sono disponibili"
    echo "Installa Docker Compose da https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Usando il comando Docker Compose: $DOCKER_COMPOSE_CMD"

# Controlla se il file .env esiste
if [ ! -f .env ]; then
    echo "Errore: il file .env è mancante"
    echo "Crea un file .env con la configurazione API richiesta"
    exit 1
fi

# Costruisce e avvia i container
echo "Costruzione e avvio dei container Docker..."
$DOCKER_COMPOSE_CMD up --build -d

# Aspetta che i servizi si avviino
echo "Attesa dell'avvio dei servizi..."
sleep 10

# Controlla se i servizi sono in esecuzione
if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
    echo "Sito disponibile su: http://localhost:3000"
    echo "Premi Invio per continuare..."
    read
else
    echo "Errore: i servizi non si sono avviati correttamente"
    $DOCKER_COMPOSE_CMD logs
    exit 1
fi
