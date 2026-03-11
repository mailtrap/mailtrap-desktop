# Mailtrap Desktop
Electron desktop app for Mailtrap — system tray integration with sandbox email testing and API/SMTP sending stats.

## Tech Stack
- **Runtime:** Electron 35, Node.js
- **Frontend:** React 18, React Router, Zustand, Tailwind CSS
- **Build:** electron-vite, Vite, TypeScript
- **IPC:** Typed preload bridge (contextBridge + ipcRenderer/ipcMain)
- **Storage:** Custom JSON store with encryption (electron safeStorage)
- **API:** Axios HTTP client against Mailtrap API

## Common Commands
```bash
npm run dev                  # Dev server (electron-vite + hot reload)
npm run build                # Production build
npx tsc --noEmit             # Type check
```

## Coding Style
- **TypeScript:** Strict mode, no `any` unless unavoidable.
- **CSS:** Tailwind with custom MTUI design tokens (colors, spacing, typography).
- **Filenames:** PascalCase for React components, camelCase for hooks/utils.
- **No pre-commit hooks** — manual lint/type-check before committing.

## Project Structure
```
electron/
  main.ts              # App initialization, window creation
  preload.ts           # IPC bridge (ElectronAPI interface)
  store.ts             # Persistent JSON storage with encryption
  tray.ts              # System tray menu
  polling.ts           # Background API polling (testing + sending)
  api/
    client.ts          # Axios HTTP client
    types.ts           # Shared TypeScript interfaces
    sandbox.ts         # Sandbox/inbox API endpoints
    stats.ts           # Sending stats API endpoints
  ipc/
    handlers.ts        # All IPC request handlers
src/
  App.tsx              # Main routing and auth state
  main.tsx             # React DOM mount
  stores/appStore.ts   # Zustand auth store
  components/
    layout/            # Sidebar, TitleBar
    sending/           # SendingDash (API/SMTP stats)
    sandbox/           # InboxList, InboxView (email testing)
    settings/          # Settings page
    auth/              # TokenSetup (login)
    ui/                # Reusable UI components (Button, ErrorBoundary)
  hooks/               # useCacheFetch, usePollingInterval, useNavigation
```

## Key Patterns
- **IPC Bridge:** All main↔renderer communication through typed `window.electron` API defined in `preload.ts` and `env.d.ts`.
- **Cache-first fetching:** `useCacheFetch` hook loads from local cache, then fetches fresh data in background.
- **Dual polling:** Main process polls sandbox inboxes and sending stats on independent intervals; renderer also polls via `usePollingInterval`.
- **Settings:** `AppSettings` in `electron/api/types.ts` with defaults; persisted via `electron/store.ts`; UI in `src/components/settings/Settings.tsx`.
- **Tray menu:** Rebuilt on every data update and click; sections conditionally shown based on settings.

## Agent Team

Use `/team <description>` to spawn a full agent team for cross-cutting features. Run `/team` with no arguments to see the roster.

- **Agent definitions:** `.claude/agents/*.md`
- **Orchestrator:** `.claude/commands/team.md`
