# Lending Collection App — Mobile (React Native / Expo)

React Native (Expo) app implementing the Agent field-collection app (progress-card home with a keypad
bottom-sheet for collecting payments) and the Admin app (cards-and-charts dashboard), talking to the
Express/PostgreSQL backend in the sibling `line_tracker_backend` repo.

## Run

```
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your backend's URL
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run it on a phone, press `w` to open the web preview,
or `a` / `i` for an Android/iOS simulator if you have one set up.

### Connecting to the backend

- **Web preview / simulator on the same machine as the backend:** `EXPO_PUBLIC_API_URL=http://localhost:4000/api` works as-is.
- **Physical phone via Expo Go:** `localhost` refers to the phone itself, not your dev machine. Set
  `EXPO_PUBLIC_API_URL` to your machine's LAN IP instead, e.g. `http://192.168.1.23:4000/api`, and make
  sure the backend (`npm start` in `line_tracker_backend`) is reachable on that network.

## Structure

- `src/App.jsx` — role picker (Agent app / Admin app), app root.
- `src/agent/AgentApp.jsx` — Home, Customers, Customer detail, Pending & missed, History, Expenses, Give money.
- `src/admin/AdminApp.jsx` — Dashboard, Villages (+ assign agent), Agents, Customers, More → Given/Collections/Expenses/Losses/Reports.
- `src/components/` — shared UI: `Header`, `BottomNav`, `Toast`, `KeypadSheet` (payment collection sheet), `BottomSheet` (generic modal sheet).
- `src/api.js` — fetch client for the backend REST API.
- `src/tokens.js` — design tokens (colors, card shadows) ported from the source Juricat design system.
