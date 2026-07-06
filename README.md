# RAImageGuard

A Discord bot that watches for users posting images with specific SHA256 checksums, then automatically bans/kicks them and deletes all of their messages.

## Features

- Monitors all image attachments posted in the guild
- Computes SHA256 checksums server-side (streaming — no temp files)
- Matches against a configurable watchlist persisted to `checksums.json`
- Configurable action: `ban` (default) or `kick`
- Deletes **every message** from the matched user across all text channels
- Slash commands for management (require `Manage Messages` permission)

## Requirements

- Node.js 20+
- A Discord account and a server where you have `Manage Server` permission

## Step-by-Step Bot Setup

### 1. Create a Discord Application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and log in.
2. Click **New Application** in the top-right corner.
3. Enter a name (e.g. "Image Guard") and click **Create**.

### 2. Create the Bot User

1. In the left sidebar, click **Bot**.
2. Click **Reset Token** and confirm. Copy the token immediately — it looks like `MTIz...`. You won't be able to see it again. Paste it somewhere safe (you'll add it to `.env` later).

### 3. Enable Privileged Gateway Intents

Still on the **Bot** page, scroll down to **Privileged Gateway Intents** and toggle ON:

- **MESSAGE CONTENT INTENT** — needed to read attachments on messages
- **SERVER MEMBERS INTENT** — needed to kick/ban members

Click **Save Changes**.

### 4. Configure Installation Contexts

1. In the left sidebar, click **Installation**.
2. Under **Installation Contexts**, make sure **Guild Install** is checked.
3. Under **Default Install Settings > Guild Install**, add these scopes:
   - `bot`
   - `applications.commands`
4. When you select `bot`, a permissions dropdown appears. Select:
   - `Kick Members`
   - `Ban Members`
   - `Manage Messages`
   - `View Channels`
   - `Send Messages`
   - `Read Message History`
5. Click **Save Changes**.

> If **Guild Install** is not enabled here, the bot will never appear in the server member list even after authorizing via the OAuth2 URL.

### 5. Get Your Application (Client) ID

1. In the left sidebar, click **General Information**.
2. Copy the **Application ID** (also called Client ID). You'll need this for `.env`.

### 6. Invite the Bot to Your Server

1. In the left sidebar, click **OAuth2 > URL Generator**.
2. Under **Scopes**, check:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, check:
   - `Kick Members`
   - `Ban Members`
   - `Manage Messages`
   - `View Channels`
   - `Send Messages`
   - `Read Message History`
4. Copy the generated URL at the bottom of the page.
5. Open it in your browser, select your server, and click **Authorize**.

### 7. Get Your Guild (Server) ID

1. Open Discord and go to **User Settings > Advanced**.
2. Toggle **Developer Mode** ON.
3. Right-click your server name in the sidebar and click **Copy Server ID** (or **Copy ID**).

### 8. Configure and Run the Bot

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable      | Description                        |
| ------------- | ---------------------------------- |
| `DISCORD_TOKEN` | Bot token from step 2             |
| `CLIENT_ID`     | Application ID from step 4        |
| `GUILD_ID`      | Server ID from step 6             |

```bash
npm install
npm run dev        # development with hot-reload
# or
npm run build && npm start   # production
```

## checksums.json

Created automatically on first run. You can also edit it directly:

```json
{
  "checksums": [
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"
  ],
  "action": "ban"
}
```

The `action` field is either `"ban"` or `"kick"`.

## Slash Commands

| Command                        | Description                    |
| ------------------------------ | ------------------------------ |
| `/add-checksum <sha256hex>`    | Add a checksum to the watchlist |
| `/remove-checksum <sha256hex>` | Remove a checksum              |
| `/list-checksums`              | Show all watched checksums      |
| `/set-action ban\|kick`        | Set the action to take          |

All commands require the `Manage Messages` permission in the server.

## Troubleshooting

### Bot logs in but says "Guilds: none" / bot never appears in server

1. Go to the **Installation** page in the Developer Portal.
2. Confirm **Guild Install** is checked under **Installation Contexts**.
3. Confirm the **Default Install Settings** for Guild Install include both `bot` and `applications.commands` scopes.
4. Re-generate the invite URL from **OAuth2 > URL Generator** and re-invite the bot.

### "Missing DISCORD_TOKEN" error

Ensure you have a `.env` file (not `.env.example`) with all fields filled in. See step 8.

## Getting a SHA256 checksum

```bash
sha256sum image.png
```

macOS:

```bash
shasum -a 256 image.png
```
