# Lending Collection App — Mobile (React Native / Expo)

React Native (Expo) admin app for running a weekly-repayment lending book: one admin login adds customers,
records collections (keypad bottom-sheet), expenses and losses, and sees a cards-and-charts dashboard. It talks
to the Express/PostgreSQL backend in the sibling `line_tracker_backend` repo.

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

- `src/App.jsx` — app root: login, then the admin app.
- `src/admin/AdminApp.jsx` — Dashboard, Collect (due today + Pending & missed), Customers (add / detail / edit), Villages, More → Money given / Collections / Expenses / Losses / Reports / Admin accounts.
- `src/components/` — shared UI: `Header`, `BottomNav`, `Toast`, `KeypadSheet` (payment collection sheet), `BottomSheet` (generic modal sheet), `SearchSelect` (searchable dropdown), `PhotoPicker` (customer photo).
- `src/validate.js` — form validation for customers.
- `src/api.js` — fetch client for the backend REST API.
- `src/tokens.js` — design tokens (colors, card shadows) ported from the source Juricat design system.
