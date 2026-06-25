# [L-Scan](https://lego-scanner.leopard.in.ua/): LEGO Minifigure Data Matrix Scanner [![Build and Deploy](https://github.com/le0pard/lego-scanner/actions/workflows/deploy.yml/badge.svg)](https://github.com/le0pard/lego-scanner/actions/workflows/deploy.yml)

L-Scan is a privacy-first, zero-overhead, fully client-side Progressive Web Application (PWA) designed to identify blind-boxed LEGO Collectible Minifigures (Series 25 and newer) instantly by decoding the tiny Data Matrix symbols printed on box bottoms.

## 🚀 Key Features

- **Multi-Threaded Edge Execution:** Heavy image manipulation, matrix tracking, and WebAssembly compilation occur strictly in isolated background Web Worker channels, keeping the browser UI fluid at a constant 60 FPS.
- **Defective Print Auto-Healing:** Incorporates a custom, hardware-accelerated **Morphological Vertical Closing Filter** (composited dilation and erosion passes) designed to reconnect severed data modules caused by factory print-head line dropouts (e.g., the standard `444R5` batch errors).
- **Intelligent Camera Frame Interleaving:** Alternates frame targets over a 4-phase cycle—combining high-speed raw extraction with localized macro zoom tracking tiers—to decode distant or minute barcodes without thermal throttling or performance drops.
- **Resilient Offline Architecture:** Complete service worker integration and Dexie/IndexedDB tracking allow the entire application, catalog database, and asset engine to boot and operate with zero cellular connection inside retail stores.
- **Real-Time Database Sync & Pruning:** Background micro-synchronization worker downloads current series catalogs, verifies file integrity via cryptographic SHA-256 hashes, and safely prunes retired items.
- **Responsive Visual Diagnostics Trait:** Built-in development diagnostics drawer exposes the live pipeline canvas states to speed up local testing of computer vision filters.

---

## 📂 Architecture and Multithreading Topography

To guarantee maximum responsiveness on low-end mobile devices, the app's computing landscape is distributed across three parallel execution contexts:

```
                  ┌─────────────────────────────────────────┐
                  │            Main UI Thread               │
                  │   Svelte 5 Core Layout & Viewfinder     │
                  └───────┬─────────────────────────┬───────┘
                          │                         │
            Comlink RPC   │                         │   Comlink RPC
            (Structured   │                         │   (Structured
             Cloning)     │                         │    Cloning)
                          ▼                         ▼
  ┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐
  │         Scanner Web Worker            │ │          Sync Web Worker              │
  │  • OffscreenCanvas Filter Pipeline    │ │  • Fetch Manifest / Hashing Engine    │
  │  • zxing-wasm C++ WebAssembly Engine  │ │  • dexie.js Transaction Write Pool    │
  └───────────────────────────────────────┘ └───────────────────────────────────────┘

```

## 🛠 Project Setup and Development Roadmap

### Prerequisites

Make sure you have Node.js installed and **Yarn** configured as your global package manager layout engine.

### Installation

Clone the repository workspace directory and pull down required packages:

```sh
yarn install
```

### Run Local Development Server

Boot up the high-speed Vite development engine server layout:

```sh
yarn dev
```

Open `http://localhost:5173` inside your browser window. Since the scanning pipeline uses secure device camera context attachments (`getUserMedia`), you must test local camera features over `localhost` or an encrypted HTTPS gateway connection.

### Compiling Production Code

Compile and bundle the static progressive web application distribution package:

```sh
yarn build
```

The output directory will contain statically compiled pages, compressed media formats, optimized image bundles, and cached asset maps, ready to deploy to any standard hosting platform. Use `yarn preview` to test your local production build environment before deploying.
