# Mover – App parcheggi strisce blu

App React Native (Expo) per pagare i parcheggi su strisce blu, commissionata da **Mover**. Design ispirato a interfacce moderne con palette Mover (blu `#003DA5` e verde lime `#C5E800`).

## Requisiti

- Node.js 18+
- npm o yarn
- Expo Go (iOS/Android) per sviluppo rapido
- Per la mappa Mapbox in produzione: build di sviluppo (vedi sotto)

## Avvio

```bash
npm install
npm start
```

Poi scegli **iOS** o **Android** nel terminale o scansiona il QR con Expo Go.

## Script

- `npm start` – Avvia Metro e Expo
- `npm run ios` – Avvia su simulatore iOS
- `npm run android` – Avvia su emulatore Android
- `npm run web` – Avvia su web (supporto limitato)

## Struttura

- **app/** – Expo Router (file-based routing)
  - **(tabs)** – Mappa, Storico, Profilo
  - **parking/** – Avvia parcheggio, Parcheggio attivo (modale)
- **components/** – Button, SearchBar, ParkingZoneCard, ParkingTimer
- **constants/** – Colori, tipi, dati mock, config (token Mapbox)
- **hooks/** – useParkingSession (stato parcheggio attivo e storico)

## Mappa

In sviluppo l’app usa **react-native-maps** (stile chiaro/muted) così da funzionare in **Expo Go** senza build nativa.

Per usare **Mapbox** (stile chiaro monocromatico):

1. Il token è in `constants/config.ts` (MAPBOX_ACCESS_TOKEN).
2. Esegui un **development build** (Mapbox richiede codice nativo):
   ```bash
   npx expo prebuild
   npx expo run:ios
   # oppure
   npx expo run:android
   ```
3. In un build nativo il token viene impostato automaticamente se il modulo Mapbox è disponibile; puoi sostituire la mappa in `app/(tabs)/index.tsx` con i componenti `@rnmapbox/maps` (MapView, Camera, PointAnnotation, UserLocation) e lo stile `mapbox://styles/mapbox/light-v11`.

## Funzionalità attuali

- Mappa con zone parcheggio (mock) e posizione utente
- Ricerca zone, bottom sheet con elenco
- Avvio parcheggio: scelta veicolo, durata, metodo di pagamento (mock)
- Sessione attiva con timer e prolunga/termina
- Storico parcheggi e profilo utente (statistiche mock)

## Estensioni future

La base è pronta per:

- API backend per zone, prezzi e pagamenti reali
- Notifiche allo scadere del parcheggio
- Integrazione Mapbox completa (navigazione, stile monocromatico)
- Gestione veicoli e metodi di pagamento reali
