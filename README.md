# LootLog

LootLog is a command-line YouTube download manager built with Node.js and TypeScript (currently locally).

It started as a small practical project as a way to learn how command-line applications and execution engines are designed, particularly in preparation for continuing building [Spectra](https://github.com/Ebiladou/Spectra), a load-testing engine written in Go.

The idea was to build something smaller that can actually be used before moving forward in building a more complicated engine and CLI in Spectra.

## How It Works

LootLog does not implement video downloading itself. Instead, it uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) as the download engine. LootLog is only responsible for managing the operation around yt-dlp.

The CLI receives the user's command and options. The `DownloadManager` coordinates download execution and controls its lifecycle. The `yt-dlp` engine communicates with the external yt-dlp process and performs the actual downloads.

SQLite provides persistent storage for download records and their statuses. This allows download information to survive after the CLI process exits.

A separate background worker is responsible for processing pending downloads. It continuously checks the database for pending work and executes downloads independently of the terminal session that created them.

The worker runs as a separate process, allowing users to interact with LootLog from different terminal sessions without keeping the original CLI process alive.

## Project Structure

```text
src/
├── cli/
│   ├── index.ts
│   └── commands/
│       ├── box.ts
│       ├── list.ts
│       ├── resume.ts
│       ├── cancel.ts
│       └── info.ts
│
├── core/
│   ├── config.ts
│   └── download.ts
│   └── network.ts
│   └── path.ts
│   └── yt-dlp.ts
│
├── database/
│   ├── db.ts
│   ├── models/
│   │   └── download.ts
│   └── repositories/
│       └── download.ts
│
└── worker/
│   ├── index.ts
│   ├── process.ts
│   ├── queue.ts
│   └── worker.ts

```

- The CLI layer defines commands and translates user input into application operations.
- The `DownloadManager` coordinates download behavior.
- The yt-dlp engine is responsible for communicating with the external `yt-dlp` process.
- The database layer handles persistence.
- The network layer monitors connectivity.

## Available Features

- YouTube video downloads
- Playlist downloads
- Audio-only downloads with MP3 conversion
- Custom output directories
- Persistent download records
- Download status tracking
- Listing downloads
- Filtering downloads by status
- Automatic pausing downloads when network connectivity is lost
- Resuming paused downloads
- Cancelling active downloads
- Optional browser cookie extraction through yt-dlp.

## Feature Commands

### Managing the Background Worker

Before jumping to download commands, the background worker must be running for pending downloads to be processed.

Start the worker:

`npx lootlog start`

Stop the worker:

`npx lootlog stop`

Check whether the worker is running:

`npx lootlog status`

### Video downloads

LootLog supports both individual videos and playlists.

A normal download downloads the individual video.:

```bash
lootlog box "<url>"
```

To explicitly download the playlist:

```bash
lootlog box "<url>" --playlist
```

### Audio downloads

Audio-only downloads can be requested with:

```bash
lootlog box "<url>" --audio
```

This requires FFmpeg to be available on the system.

### Custom output directory

By default, LootLog uses a local `Lootlog` directory inside the user's Downloads directory.

A different destination can be supplied with:

```bash
lootlog box "<url>" --output ~/Downloads/YouTube/videos
```

### Listing downloads

- List all downloads:

```bash
lootlog list
```

- Filter by status:

```bash
lootlog list --status PAUSED
```

Status values are case-insensitive, so this also works:

```bash
lootlog list --status paused
```

### Resuming a download

A paused download can be resumed with its ID:

```bash
lootlog resume <id>
```

### Cancelling a download

An active download can be cancelled with:

```bash
lootlog cancel <id>
```

### Download information

The info command is intended to display detailed information about a specific download:

```bash
lootlog info <id>
```

### Configuration

LootLog maintains a global configuration file under `~/.lootlog/config.json`. The file is created automatically with default settings when it does not exist. One of the configurations here is the Browser cookies, which are optional and disabled by default.

YouTube may sometimes restrict downloads and require authentication. If this happens, users can configure LootLog to use cookies from a browser where they are already signed in to YouTube. For instance:

`npx lootlog config set cookies chrome`

Other supported browsers include:

- Chrome
- Chromium
- Firefox
- Edge
- Opera
- Safari

The selected browser is stored in the global configuration. LootLog passes the browser preference to yt-dlp, which handles cookie extraction and authentication.

To view the current cookie configuration:

`npx lootlog config get cookies`

To disable browser cookies:

`npx lootlog config set cookies off`

After changing the setting, restart the background worker for the updated configuration to take effect:

`npx lootlog stop`
`npx lootlog start`

### Network Interruption (Pause)

LootLog has a connectivity monitor that periodically checks whether the application can reach the network. When connectivity is lost, LootLog can stop the active yt-dlp process and mark the download as PAUSED.

When the network is available again, the download can be resumed. The underlying yt-dlp invocation uses its continuation behavior so that a partially downloaded file can continue rather than unnecessarily starting from the beginning.

(Automatic recovery is still an area of development.)

## Installation

LootLog is currently **not packaged as an npm package**. It is intended to be cloned and run locally for now.

### Requirements

- Node.js
- npm
- yt-dlp
- FFmpeg
- Deno

### Clone the repository

```bash
git clone https://github.com/Ebiladou/LootLog.git
cd LootLog
```

### Install dependencies

```bash
npm install
```

### Build the project

```bash
npm run build
```

### Run the CLI locally

LootLog is configured as an npm CLI executable through the `bin` field in `package.json`. The executable points to the compiled CLI entry point.
For local development, run it with npx:

```bash
npx lootlog --help
```

For example:

```bash
npx lootlog box "<url>"
```

## Local Application Data

LootLog stores application data under:

```text
~/.lootlog/
```

The SQLite database is:

```text
~/.lootlog/database.sqlite
```

The default download directory is separate from the application data and is normally:

```text
~/Downloads/Lootlog
```

Although LootLog allows users configure Downloads directory before falling back to the standard location. And because the project is still under development, the local database can currently be recreated when the schema changes.

For instance:

```bash
rm ~/.lootlog/database.sqlite
```

The database will be recreated the next time LootLog starts. Conviniet than migration, and does not matter since this is local for now.

## Current Status

LootLog is currently in active development, subject to my time and mental health status.

There are a bunch of things to fix, really, so the project will continue to evolve as the underlying concepts become clearer.

## CLI Reference

### Worker commands

Start the background worker

`lootlog start`

Stop the background worker

`lootlog stop`

Check worker status

`lootlog status`

### Download a YouTube video.

`lootlog box <url>`

Options:

- -o, --output <directory> Download directory
- -a, --audio Download audio only and convert to MP3
- --playlist Download every video in the playlist

Examples:

```bash
npx lootlog box "<url>"
npx lootlog box "<url>" --audio
npx lootlog box "<url>" --playlist
npx lootlog box "<url>" --output ~/Downloads/Lootlog/videos
```

Options can also be combined:

`npx lootlog box "<url>" --audio --output ~/Downloads/Lootlog/audio`

### list downloads

`lootlog list`

Option:

- -s, --status <status> Filter by download status

Examples:

```bash
npx lootlog list
npx lootlog list --status PAUSED
```

### Resume a paused download.

`lootlog resume <id>`

Example:

`npx lootlog resume cced60d8-cfba-46e8-b1a5-4993a062ce7a`

### Cancel an active download.

`lootlog cancel <id>`

Example:

`npx lootlog cancel cced60d8-cfba-46e8-b1a5-4993a062ce7a`

### Show information about a download.

`lootlog info <id>`

Example:

`npx lootlog info cced60d8-cfba-46e8-b1a5-4993a062ce7a`
