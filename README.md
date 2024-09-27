# TrForex

Impara a gestire la FOMO da trader a costo zero

## Descrizione

Con l'app **TrForex**, i giovani investitori che desiderano entrare nel mondo azionario possono creare un conto demo per aprire posizioni in Forex e comprare azioni, senza rischiare il proprio capitale. TrForex è progettata per aiutarti a sviluppare le tue competenze di trading e a gestire la paura di perdere opportunità (FOMO).

## Caratteristiche

- **Conto Demo**: Inizia a fare trading senza rischiare il tuo denaro.
- **Forex e Azioni**: Sperimenta diverse strategie di investimento in un ambiente sicuro.
- **Formazione**: Risorse educative per migliorare le tue conoscenze sul trading.
- **Gestione della FOMO**: Strumenti e consigli per aiutarti a prendere decisioni più consapevoli.

## Come Iniziare

1. Scarica l'app TrForex.
2. Crea il tuo conto demo.
3. Inizia a esplorare le opportunità di trading in Forex e azioni.

## Esempio di richiesta API

1. un esempio di richiesta risposta API può essere la richiesta di una certa quotazione , per esempio EURUSD , e la risposta del minimo e massimo giornaliero
   in input
  {
  	charm : "EURUSD"
  }

  output 
  {
      "charm": "EURUSD",
      "data": [
          {
              "data": "2024-09-26",
              "massimo": 1.0750,
              "minimo": 1.0700
          },
          {
              "data": "2024-09-25",
              "massimo": 1.0745,
              "minimo": 1.0695
          },
          {
              "data": "2024-09-24",
              "massimo": 1.0730,
              "minimo": 1.0680
          },
          {
              "data": "2024-09-23",
              "massimo": 1.0720,
              "minimo": 1.0670
          },
          {
              "data": "2024-09-22",
              "massimo": 1.0710,
              "minimo": 1.0660
          }
      ]
  }  

## Contribuire

Se desideri contribuire al progetto, sei il benvenuto! Puoi segnalare bug, proporre nuove funzionalità o migliorare la documentazione. Per favore, apri una pull request o crea un issue.

Unisciti a noi in questo viaggio di apprendimento e scoperta nel mondo del trading!
