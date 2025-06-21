# Web Overlay

A transparent web overlay system for Linux, designed to display web content (like DPS meters) on top of other applications.

This tool is opinionated specifically to solve a problem with the FFXIV tooling ecosystem on linux, there isn't really a great way to handle ACT / IINACT transparent overlays. You can probably reuse this to create some cool HUDs if you wanted to. 

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

### Option 1: Quick Install (Recommended)

1. Clone and install in one step:
```bash
git clone https://github.com/Vrandus/web-overlay.git && cd web-overlay && sudo ./install.sh
```

This will:
- Install all dependencies
- Build the project
- Install the CLI tool globally
- Make it available as `web-overlay` command

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/Vrandus/web-overlay.git
cd web-overlay
```

2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Install globally:
```bash
npm install -g .
```

## CLI Usage

The `web-overlay` command is now available globally. Here are the available commands:

### Managing Overlays

```bash
# List all configured overlays
web-overlay list

# Add a new overlay
web-overlay add <id> <url> [options]

# Remove an overlay
web-overlay remove <id>

# Start a specific overlay
web-overlay start <id> [--debug]

# Stop a specific overlay
web-overlay stop <id>

# Start all overlays
web-overlay start

# Stop all overlays
web-overlay stop
```

### Command Options

When adding a new overlay (`web-overlay add`), the following options are available:

```bash
Options:
  --ws-uri <uri>         WebSocket URI for the overlay
  --name <name>          Display name for the overlay
  --x <number>           X position (default: 100)
  --y <number>           Y position (default: 100)
  --width <number>       Window width (default: 400)
  --height <number>      Window height (default: 300)
  --opacity <number>     Window opacity (0-1, default: 0.9)
  --no-click-through     Disable click-through
  --always-on-top        Keep window always on top
```

### Examples

```bash
# Add a DPS meter overlay
web-overlay add dps-meter file:///path/to/overlay.html \
  --name "DPS Meter" \
  --ws-uri ws://127.0.0.1:10501/ws \
  --width 800 \
  --height 600 \
  --opacity 0.8

# Start with debug logging
web-overlay start dps-meter --debug

# List all configured overlays
web-overlay list

# Stop all running overlays
web-overlay stop
```

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

## Hyprland Configuration

If you're using Hyprland as your window manager, you'll need to configure some window rules to ensure the overlays work correctly. Add these rules to your Hyprland configuration file (typically `~/.config/hypr/hyprland.conf`):

```bash
# Window rules for overlays
windowrulev2 = float, title:^(FFXIV-Overlay)$
windowrulev2 = pin, title:^(FFXIV-Overlay)$
windowrulev2 = noblur, title:^(FFXIV-Overlay)$
windowrulev2 = nofocus, title:^(FFXIV-Overlay)$
windowrulev2 = nodim, title:^(FFXIV-Overlay)$
windowrulev2 = noborder, title:^(FFXIV-Overlay)$
windowrulev2 = noanim, title:^(FFXIV-Overlay)$
```

### Full Example with FFXIV Setup
Here's a complete example showing how to configure both FFXIV and its overlays in Hyprland:

```bash
# FFXIV Workspace Configuration
workspace = name:FFXIV, monitor:DP-2
windowrulev2 = workspace name:FFXIV, title:^(XIVLauncher)$

# FFXIV Main Window Rules
windowrulev2 = maximize, title:^(FINAL FANTASY XIV)$
windowrulev2 = opaque, title:^(FINAL FANTASY XIV)$
windowrulev2 = nodim, title:^(FINAL FANTASY XIV)$
windowrulev2 = workspace name:FFXIV, title:^(FINAL FANTASY XIV)$

# FFXIV Overlay Rules
windowrulev2 = workspace name:FFXIV, title:^(FFXIV-Overlay)$
windowrulev2 = float, title:^(FFXIV-Overlay)$
windowrulev2 = pin, title:^(FFXIV-Overlay)$
windowrulev2 = noblur, title:^(FFXIV-Overlay)$
windowrulev2 = nodim, title:^(FFXIV-Overlay)$
windowrulev2 = noborder, title:^(FFXIV-Overlay)$
windowrulev2 = noanim, title:^(FFXIV-Overlay)$
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
