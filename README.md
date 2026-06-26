# [L-Scan](https://lego-scanner.leopard.in.ua/): LEGO Minifigure Data Matrix Scanner [![Build and Deploy](https://github.com/le0pard/lego-scanner/actions/workflows/deploy.yml/badge.svg)](https://github.com/le0pard/lego-scanner/actions/workflows/deploy.yml)

L-Scan is a privacy-first, zero-overhead, fully client-side Progressive Web Application (PWA) designed to identify blind-boxed LEGO Collectible Minifigures (Series 25 and newer) instantly by decoding the tiny Data Matrix symbols printed on box bottoms.

## 🚀 Key Features

- **Multi-Threaded Edge Execution:** Heavy image manipulation, matrix tracking, and WebAssembly compilation occur strictly in isolated background Web Worker channels, keeping the browser UI fluid at a constant 60 FPS.
- **Defective Print Auto-Healing:** Incorporates a custom, hardware-accelerated **Morphological Vertical Closing Filter** (composited dilation and erosion passes) designed to reconnect severed data modules caused by factory print-head line dropouts (e.g., the standard `444R5` batch errors).
- **Intelligent Camera Frame Interleaving:** Alternates frame targets over a 4-phase cycle—combining high-speed raw extraction with localized macro zoom tracking tiers—to decode distant or minute barcodes without thermal throttling or performance drops.
- **Resilient Offline Architecture:** Complete service worker integration and Dexie/IndexedDB tracking allow the entire application, catalog database, and asset engine to boot and operate with zero cellular connection inside retail stores.
- **Real-Time Database Sync & Pruning:** Background micro-synchronization worker downloads current series catalogs, verifies file integrity via cryptographic SHA-256 hashes, and safely prunes retired items.
- **Responsive Visual Diagnostics Trait:** Built-in development diagnostics drawer exposes the live pipeline canvas states to speed up local testing of computer vision filters.

## Catalog Data Management

All inventory catalogs, batch manufacturing codes, and localized figure markers are managed statically within the repository codebase.

### Where to Add or Edit Data

- **Inventory Entries (JSON):** Catalog datasets are placed within the `src/lib/data/` directory.json/+server.js]. Each series has its own standalone data sheet named after its collection slug (e.g., `series-28.json`, `f1-race-cars.json`).
- **Character Images:** Physical character illustration images are stored under `src/lib/assets/minifigures/[series-slug]/`.

### JSON Schema Specifications

Below is the structured property configuration model required for every catalog collection database entry:

#### Top-Level Keys

- `series` *(string)*: Unique URL-safe identifier handle for the inventory group (e.g., `"series-28"`).
- `displayName` *(string)*: Human-readable formal marketing name displayed across informational panels (e.g., `"Series 28"`).
- `releaseYear` *(integer)*: The calendar year index representing when the collection group hit retail markets (e.g., `2025`).
- `minifigures` *(array)*: Core index list containing configuration blocks for each character figure in the set.

#### Minifigure Object Profile Keys

- `slug` *(string)*: System-wide unique identifier token tracking this exact figure entry (e.g., `"s28_peacock"`).
- `name` *(string)*: The descriptive name of the character figure printed on interface cards (e.g., `"Peacock"`).
- `imagePath` *(string)*: Root-relative pathway reference used by SvelteKit's static pre-compiler to fetch and build retina-optimized media formats (e.g., `"/assets/minifigures/series-28/peacock.jpg"`).
- `identifiers` *(array)*: List containing the matrix stamps mapped to this character figure across different global manufacturing plants.

#### Identifier Variant Keys

- `code` *(string)*: The base 7-digit material packaging code sequence printed on the box bottom (e.g., `"6584394"`).
- `factory` *(string, optional)*: Single character code representing the packaging plant location (e.g., `"S"` for Czech Republic, `"R"` for Mexico).
- `year` *(string, optional)*: Single digit tracker marking the factory production calendar timeline year (e.g., `"5"` for 2025).

```json
{
  "series": "series-28",
  "displayName": "Series 28",
  "releaseYear": 2025,
  "minifigures": [
    {
      "slug": "s28_peacock",
      "name": "Peacock",
      "imagePath": "/assets/minifigures/series-28/peacock.jpg",
      "identifiers": [
        { "code": "6584394", "factory": "R", "year": "5" },
        { "code": "6584381", "factory": "S", "year": "5" }
      ]
    }
  ]
}

```

## Public API Endpoints

L-Scan relies on pre-rendered, statically hosted JSON data feeds to perform background client database transformations with zero runtime backend overhead. For detailed contract object schemas, endpoint parameter details, and token flattening keys, check out the [Public API Endpoints Wiki](https://github.com/le0pard/lego-scanner/wiki/Public-API-Endpoints).

## Project Setup

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
