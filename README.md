# TRACK GUARD — Locomotion & Navigation System

A complete web application and navigation interface for the Track Guard robot project, supporting dual locomotion modes (Wheel Mode & Integrated Mode), map-based destination selection, shortest-distance path planning, turn-by-turn navigation guidance, and manual arrival completion.

---

## 1. Project Overview & Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet & React-Leaflet, Lucide icons.
- **Backend**: Python / Flask running at `http://127.0.0.1:5000` with SQLite session storage and OSRM pedestrian/robot network routing.
- **GNSS Hardware**: 7semi NEO-M9N GNSS receiver (`COM10` @ 38400 baud) and ESP32-WROOM microcontroller (`COM3`).
- **Offline Mapping**: Leaflet with configurable local raster tile service (`/tiles/{z}/{x}/{y}.png`) and OpenStreetMap live layer fallback with proper attribution.

---

## 2. GPS & Hardware Diagnostic Report

### Why Live GPS Data Is Currently Unreliable / Offline
1. **Physical COM Port Disconnection**:
   - The backend was configured to read from `COM10` at `38400` baud.
   - A hardware inspection of Windows serial devices (`[System.IO.Ports.SerialPort]::GetPortNames()`) revealed that only Bluetooth serial links (`COM4`, `COM5`, `COM6`, `COM7`, `COM8`, `COM14`) were attached.
   - The Flask backend reports:
     ```text
     Port COM10 connection error: could not open port 'COM10': FileNotFoundError(2, 'The system cannot find the file specified.', None, 2)
     ```
2. **Graceful Fallback Implementation**:
   - The application checks `fix_valid` and GNSS fix quality from `GET /api/gps`.
   - When satellite fix is unavailable or stale, an obvious warning banner is displayed: `GPS Unavailable / Waiting for GNSS Fix (COM10 Disconnected)`.
   - The map allows the operator to select a start location manually on the map.
   - Coordinates are distinctly labeled as **"Manual Start"**, never misrepresented as "Current GPS".
   - Telemetry readings for Lat, Lon, Speed, and Heading display `N/A` rather than fabricated zeros or fake locations.
3. **Hardware Reconnection Steps**:
   - Plug the 7semi NEO-M9N USB cable firmly into the Windows laptop.
   - Open Device Manager -> **Ports (COM & LPT)** to verify assigned COM port number.
   - If Windows assigns a different COM port (e.g. `COM11`), update `port` in the configuration or reassign it to `COM10` in Device Manager properties.

---

## 3. Screen Flow & Features

### Screen 1 — Minimal Mode Selection
- **Clean dark aesthetic**: `#070b14` background with subtle cyan/blue accents and robot iconography.
- **Heading**: `Select Locomotion Mode`.
- **Options**:
  - **Wheel Mode**: Motorized rolling locomotion for paved, structured pathways.
  - **Integrated Mode**: Articulated wheeled-leg locomotion for irregular terrain and obstacles.
- Strictly isolated: no maps, telemetry panels, or widgets on the initial screen.
- Clicking either mode stores the locomotion mode, updates `/api/mode`, and advances to Screen 2.

### Screen 2 — Map & Destination Selection
- Full interactive Leaflet map supporting panning and zooming.
- **Start Location**: Auto-populates from live GNSS coordinates when valid; otherwise displays `Manual Start` with manual map pin placement and a disabled "Use Current GPS" button.
- **Destination Selection**: Click anywhere on the map to place the red destination target pin, with "Change Destination" option.
- **Shortest-Distance Routing**:
  - Sends coordinates to `POST /api/route`.
  - Computes path through local OSRM road/path network profile.
  - Draws cyan route polyline and fits viewport to complete geometry.
  - Displays total route distance, estimated duration, and turn-by-turn maneuver preview.
  - **Start Locomotion** button is revealed only after route calculation succeeds.
- **Back Button**: Returns to Screen 1.

### Screen 3 — Active Navigation Dashboard
- **50:50 Desktop Split Layout**:
  - **Left Half (Vertical Split)**:
    - *Upper*: Map showing active planned route (solid cyan), start pin, destination pin, live robot marker (when GNSS fix is active), and traveled track polyline (amber dashed). Warning badge shown if GNSS is disconnected/stale.
    - *Lower*: Hardware Telemetry Panel displaying Latitude, Longitude, Speed (km/h), Heading, Application Mode, Robot Locomotion Mode (placeholder/reported), GNSS Fix Status, and Last Update Time.
  - **Right Half**: Directions Panel displaying:
    - Top banner with directional maneuver icon, next instruction in large uppercase text (e.g. `TURN LEFT ONTO VITTAL MALLYA ROAD`), distance to turn, and total route distance.
    - Full scrollable turn-by-turn step list with highlighted active maneuver.
- **Reached Location (Manual Arrival Completion)**:
  - Prominent arrival completion button with confirmation modal.
  - Marks session completion as `manual` (preventing misrepresentation as GPS-confirmed).
  - Persists session to database via `POST /api/navigation/complete`.
  - Clears active session state and returns directly to **Screen 1 (Mode Selection)**.
- **Stop Navigation**: Cancels session without marking arrival.

---

## 4. Offline Map & Routing Setup Guide

1. **Regional Map Extract**:
   - Download the OSM PBF extract for the test area (e.g. Bengaluru, India):
     ```powershell
     curl.exe -LO https://download.geofabrik.de/asia/india-latest.osm.pbf
     ```
2. **Local Tile Extraction**:
   - Extract raster tiles for offline Leaflet rendering into `c:\final_review\tiles`:
     ```powershell
     # Using mb-util or tile-join:
     mb-util --image_format=png region.mbtiles ./tiles
     # Expected structure:
     # c:\final_review\tiles\{z}\{x}\{y}.png
     ```
3. **Local OSRM Routing Engine**:
   - The Flask backend is connected to OSRM on `http://127.0.0.1:5000/api/route`.

---

## 5. Exact PowerShell Commands to Launch Application

### Step 1: Verify / Run Flask Backend (if not already running)
```powershell
cd C:\Users\rahul\TrackGuard
& ".\.venv\Scripts\python.exe" server.py
```
*(Backend runs on `http://127.0.0.1:5000`)*

### Step 2: Launch Track Guard Frontend Website
```powershell
cd c:\final_review
npm run dev -- --port 5173 --host 127.0.0.1
```
Open **`http://127.0.0.1:5173`** in your browser.

### Step 3: Run Acceptance Test Suite
```powershell
cd c:\final_review
& "C:\Users\rahul\AppData\Local\Python\pythoncore-3.14-64\python.exe" test_suite.py
```
*(Runs all 14 integration and API tests, verifying 100% pass rate)*
