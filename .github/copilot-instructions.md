# Cloudburst Detection System - AI Agent Instructions

This is an IoT + AI system for real-time cloudburst prediction and community alert. AI agents should understand these core patterns before contributing.

## Architecture Overview

**Data Flow**: IoT sensor nodes (Arduino/NodeMCU) → LoRa mesh network → Gateway (NodeMCU ESP8266) → Firebase Realtime DB → Next.js web dashboard → SMS alerts (Twilio) + ML predictions (XGBoost)

**Three-Tier Stack**:

- **Frontend**: Next.js 15 + React 19 (client components) with multi-language support (7 Indian languages via `next-intl`)
- **Backend**: Next.js API routes (`src/app/api/*`)
- **Data**: Firebase Realtime Database + CSV-based predictions

## Critical Patterns

### 1. Authentication & Authorization

**File**: `src/features/auth/`

- Uses **mock auth** (not Firebase Auth) with role-based access control
- Three roles: `ADMIN`, `NODE_REGISTRAR`, `USER` (defined in `authService.js`)
- User stored in localStorage with format: `{ id, email, role, name }`
- **Pattern**: `useAuth()` hook provides `{ user, role, isAuthenticated, initializing, login, logout }`
- Example from `Sidebar.js`: Filter nav items by `item.roles.includes(role)`

**When adding protected pages**:

```javascript
// In new page components
const { role, isAuthenticated } = useAuth();
if (!isAuthenticated) redirect("/login");
if (role !== "ADMIN") return <UnauthorizedPage />;
```

### 2. Layout & Component Structure

**Root Layout** (`src/app/layout.js`): Wraps entire app with providers in this order:

1. `NextIntlClientProvider` (i18n)
2. `ThemeProvider` (dark/light mode)
3. `AuthProvider` (auth state)
4. `AppShell` (sidebar + navbar layout)

**AppShell** (`src/components/AppShell.js`):

- Manages sidebar collapsed state and mobile drawer
- Auth routes (`/login`) render full-width without sidebar
- Navbar is fixed top with hamburger menu (mobile)
- Sidebar is fixed left (desktop) or overlay drawer (mobile)

### 3. Internationalization (i18n)

**File**: `src/i18n/config.js`

- Supports: English, Hindi, Bengali, Telugu, Marathi, Tamil, Kannada
- Message files: `messages/{en,hi,bn,te,mr,ta,kn}.json`
- **Usage**: `const t = useTranslations('section')` then `t('key')`
- Locale auto-detected from URL path (`/en/page`, `/hi/page`)

### 4. Firebase Realtime Database Integration

**File**: `src/lib/firebase.js`

- Credentials are hardcoded (NOT in env vars) — intentional for demo
- Exports: `database` (reference) + Firebase functions: `ref, set, get, onValue, update, remove, query, limitToLast`
- Data structure observed from usage: nodes stored at `nodes/{nodeId}` with fields like `lastUpdate`, `temperature`, `humidity`

**Pattern** (from `page.js`):

```javascript
import { database, ref, onValue } from "@/lib/firebase";

// Listen to realtime updates
const dbRef = ref(database, "nodes");
onValue(dbRef, (snapshot) => {
  const data = snapshot.val();
  setNodes(data || {});
});
```

### 5. Toast Notifications

**File**: `src/contexts/ToastContext.js`

- Global notification system with auto-dismiss
- Usage: `const { showToast } = useToast()` then call:
  ```javascript
  showToast({
    type: "success", // 'info', 'success', 'warning', 'error'
    title: "Node Registered",
    message: "Node3 added",
    duration: 3000, // ms, 0 = no auto-dismiss
  });
  ```

### 6. API Routes & Predictions

**Predict Route** (`src/app/api/predict/route.js`):

- Reads `cloudburst_cleaned.csv` file
- Returns sample predictions with format: `{ minTemp, maxTemp, rainfall, prediction, confidence }`
- Currently uses dummy data; intended to integrate XGBoost model
- Response: `{ success: true, predictions: [...], totalPredicted: N }`

**SMS Route** (`src/app/api/sms/route.js`):

- Sends SMS alerts via Twilio
- Checks env: `NEXT_PUBLIC_TWILIO_ENABLED`, `NEXT_PUBLIC_TWILIO_ACCOUNT_SID`, `NEXT_PUBLIC_TWILIO_PHONE_NUMBER`, `TWILIO_AUTH_TOKEN`
- Returns graceful failure if not configured (doesn't crash)

### 7. Utility Functions

**File**: `src/lib/utils.js`

- `getNodeStatus(lastUpdate)`: Returns `'online'` (< 5 min), `'warning'` (< 15 min), `'offline'`
- `formatTimeAgo()`, `formatDateTime()`: Date formatting
- **Important**: Node status is a key metric for dashboard health checks

### 8. Theme & Styling

- **CSS Framework**: Tailwind CSS with `dark:` prefix for dark mode
- **Theme Toggle**: `next-themes` package (component at `src/components/ThemeToggle.js`)
- **Colors**: Blue/indigo gradient for main backgrounds
- **Icons**: `lucide-react` (not custom SVGs)

## Development Workflows

### Running the App

```bash
cd cloudburst-detection
npm install
npm run dev
```

Visit `http://localhost:3000` (auto-opens in browser)

### Building

```bash
npm run build
npm start  # production server
```

### Linting

```bash
npm run lint
```

### Environment Setup

- `.env.local` should contain Twilio credentials (optional for dev)
- Firebase config is hardcoded in `firebase.js` (already initialized)

## File Organization & Key Directories

| Directory                | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `src/app`                | Next.js page routes + API handlers + root layout   |
| `src/app/api`            | API routes (predict, SMS)                          |
| `src/components`         | Reusable React components (Sidebar, Navbar, etc.)  |
| `src/features/auth`      | Auth context + service + protected route wrapper   |
| `src/features/analytics` | AnalyticalPanel component for data visualization   |
| `src/contexts`           | Global state (Toast notifications)                 |
| `src/i18n`               | Internationalization config + request handler      |
| `src/lib`                | Core services (Firebase, utilities, notifications) |
| `messages`               | i18n JSON files (one per language)                 |
| `public`                 | Static assets                                      |

## Common Patterns to Follow

1. **Client Components**: Add `'use client'` at top of component files that use hooks
2. **Error Handling**: Wrap API calls in try-catch; show toast on error
3. **Loading States**: Use `useState` + conditional rendering (not loading skeletons — project uses simple spinners)
4. **Real-time Data**: Subscribe with `onValue()` from Firebase; remember to clean up listeners
5. **Role-based UI**: Check `role` from `useAuth()` before rendering sensitive features
6. **Responsive Design**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`) for mobile-first layout

## Known Limitations & TODOs

- **Auth**: Currently mock-based (no real database validation)
- **ML Model**: Predictions API returns dummy data; integrate XGBoost model
- **Twilio**: SMS gracefully fails if credentials missing (doesn't block app)
- **Hardware**: Arduino code in `MicroControllerCode/` (separate from web app)

## Testing

Run `python test.py` for hardware schematic diagram generation (not web tests currently).

---

**Last Updated**: November 2025 | **Framework**: Next.js 15 + React 19 | **Database**: Firebase Realtime DB
