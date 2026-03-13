# Port587

A lightweight cross-platform desktop app for managing email senders. Monitor your email sending stats and test sandbox inboxes directly from your desktop. Currently supports [Mailtrap.io](https://mailtrap.io) with more senders coming soon.

## Features

- **Multi-Account** — Save multiple sender accounts, switch between them with one click
- **System Tray Menu** — Quick-glance native menu showing sandbox inboxes (with unread counts and last email) and sending stats
- **Email Testing** — Browse sandbox inboxes, view message lists, and render full HTML emails
- **Email Sending** — View sending stats (sent, delivered, bounced) with trend charts
- **Settings** — Configurable polling interval, startup behavior, view toggles

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

## Setup

```bash
# Install dependencies
npm install

# Generate tray icon placeholder (optional, for development)
node scripts/generate-tray-icon.js

# Start in development mode
npm run dev
```

## Development

```bash
npm run dev          # Start Electron in dev mode with hot reload
npm run build        # Build the app
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

## Building for Distribution

```bash
npm run dist         # Build and package for current platform
```

This produces:
- **macOS**: `.dmg` in `release/`
- **Windows**: `.exe` installer in `release/`
- **Linux**: `.AppImage` and `.deb` in `release/`

## Configuration

On first launch, add a sender account with your API token. For Mailtrap, you can find it at:
**[Mailtrap Settings > API Tokens](https://mailtrap.io/api-tokens)**

## Architecture

```
electron/           Electron main process (Node.js)
  main.ts           App entry point, window creation
  tray.ts           System tray with dynamic native context menu
  preload.ts        Secure bridge between main and renderer
  api/              API client and endpoint wrappers
  ipc/              IPC handlers (main <-> renderer communication)
  store.ts          Secure token storage (OS keychain via safeStorage)

src/                React renderer (frontend)
  App.tsx           Root component with routing
  components/       UI components organized by feature
  stores/           Zustand state management
  hooks/            Custom React hooks
```

## Tech Stack

- **Electron** — Cross-platform desktop framework
- **React 18** + TypeScript — Frontend UI
- **Tailwind CSS** — Styling with MTUI design tokens
- **Zustand** — State management
- **Recharts** — Charts and sparklines
- **electron-vite** — Build tooling
- **electron-builder** — Packaging and distribution
