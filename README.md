# Web Overlay

A transparent web overlay system for Linux, designed to display web content (like DPS meters) on top of other applications.

## Features

- Transparent window overlays
- Click-through capability
- Multiple overlay support
- Persistent window positions
- WebSocket support for real-time updates
- Configuration file based setup

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/web-overlay.git
cd web-overlay
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

1. Start the application:
```bash
npm start
```

2. Configure your overlays in the configuration file (see Configuration section below)

## Configuration

The application uses a configuration file to manage overlays. The configuration is stored in your user's home directory under `.config/web-overlay/config.json`.

Example configuration:
```json
{
  "overlays": [
    {
      "id": "dps-meter",
      "name": "DPS Meter",
      "url": "file:///path/to/your/overlay.html",
      "wsUri": "ws://127.0.0.1:10501/ws",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 400, "height": 300 },
      "opacity": 0.9,
      "clickThrough": true,
      "alwaysOnTop": true
    }
  ],
  "globalSettings": {
    "startWithSystem": false,
    "defaultOpacity": 0.9,
    "defaultClickThrough": true
  }
}
```

## CLI Commands

The overlay manager comes with a command-line interface for managing overlays. Here are some common commands:

### List Overlays
```bash
# Show all configured overlays
npm run overlay list
```

### Managing Individual Overlays
```bash
# Add a new overlay
npm run overlay add dps-meter file:///path/to/overlay.html --name "DPS Meter" --ws-uri ws://127.0.0.1:10501/ws

# Start a specific overlay
npm run overlay start dps-meter

# Stop a specific overlay
npm run overlay stop dps-meter

# Remove an overlay from configuration
npm run overlay remove dps-meter
```

### Managing All Overlays
```bash
# Start all configured overlays
npm run overlay start-all

# Stop all running overlays
npm run overlay stop-all
```

### Additional Options
When adding or starting overlays, you can use these options:
```bash
# Add an overlay with custom position and size
npm run overlay add stats-overlay http://localhost:3000 \
  --name "Stats" \
  --x 200 \
  --y 300 \
  --width 800 \
  --height 600 \
  --opacity 0.8

# Start an overlay in debug mode
npm run overlay start dps-meter --debug
```

## Development

1. Run in development mode:
```bash
npm run dev
```

2. Watch for changes:
```bash
npm run watch
```

## License

MIT 