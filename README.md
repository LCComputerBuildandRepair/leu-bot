# LEU — Light 'Em Up Gaming Discord Bot

An all-in-one Discord bot that **builds and runs the entire Light 'Em Up Gaming
(LEU) server** — a multi-game / competitive (esports) gaming community with a
fire-and-lightning brand (🔥 fire-orange + ⚡ electric blue). One command (`/setup`)
creates every role, category, channel, permission and interactive panel. From
there the bot handles verification, self-assign roles, tickets, moderation,
competitive tooling (scrims, tournaments, LFG, roster), leveling, a starboard,
join-to-create voice, automod, and more.

Built with **discord.js v14**, zero native dependencies — installs cleanly on a
Windows VPS (the same one you run RedM on).

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Server build** | `/setup` creates all roles, categories, channels & permissions from one blueprint. Re-runnable & self-repairing. |
| **Verification** | New members land as *Unverified*; one click in #verify unlocks the server. |
| **Self-assign roles** | 23 game roles + ping roles via dropdown menus in #get-roles. |
| **Game channels** | Picking a game role **unlocks that game's channels** (others stay hidden). **Every game gets its own category** with chat / LFG / clips / voice, locked to its role. |
| **Leveling** | Earn XP by chatting; level-up announcements; `/rank` & `/leaderboard`. |
| **Join-to-Create voice** | Join **➕ Join to Create** → a personal voice room is spun up (auto-deleted when empty). |
| **Starboard** | ⭐ a message 3× and it lands in #highlights. |
| **Automod** | Auto-removes invite links & punishes mass-mention spam (staff exempt). |
| **Suggestions** | Posts in #suggestions get 👍/👎 + a discussion thread automatically. |
| **Cleanup** | `/cleanup` deletes leftover old channels & unused roles, and grants every existing member the verified role. |
| **Music Quiz** | `/musicquiz` — bot joins your voice channel and plays 30s clips of top songs in a chosen genre; first to type the song/artist scores. Powered by Deezer (no API key) + FFmpeg. |
| **Movie Night** | `/movienight` — schedule a night, pick the service, RSVP buttons, auto watch-party instructions. (Can't stream Netflix/Hulu/etc. — DRM forbids it — so it coordinates + points to each service's official Watch Party.) |
| **Level rewards** | Auto-granted roles at levels 5/10/25/50/100. |
| **Per-game LFG** | `/lfg game:` posts into that game's channel and pings its role. |
| **Refresh panels** | `/refreshpanels` wipes & re-posts all panels in one click. |
| **Utility** | `/userinfo` `/serverinfo` `/poll` `/embed`. |
| **Branded embeds** | The LEU logo appears on every embed. |
| **Tickets** | Category-based private support tickets with staff pings + transcript logging. |
| **Moderation** | `/mod` warn, warnings, timeout, kick, ban, unban, purge — all logged. |
| **Competitive** | `/scrim` (sign-up sheets), `/tournament`, `/lfg`, `/roster`. |
| **Community** | `/announce`, live `/status` panel, auto-welcome messages. |

---

## 🚀 Setup (Windows VPS)

### 1. Create the bot application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy the token.
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent**.
4. **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`, bot permission **Administrator** (simplest), then open the URL to invite the bot to your server.

### 2. Install
```bash
cd leu-bot
npm install
copy .env.example .env      # then edit .env
```
Fill in `.env`:
- `DISCORD_TOKEN` – the bot token
- `CLIENT_ID` – Application ID (General Information tab)
- `GUILD_ID` – right-click your server → Copy Server ID (enable Developer Mode first)

### 3. Run
```bash
npm start
```
Slash commands register automatically on startup.

### 4. Build the server
In Discord, run **`/setup`**.
> ⚠️ Drag the bot's role to the **top** of your server's role list first, so it can manage every role and channel.

That's it — your server is built. Run `/setup` again any time to repair missing pieces.

---

## 🧰 Keeping it running 24/7

Use **PM2** so it restarts on crash/reboot:
```bash
npm install -g pm2
pm2 start index.js --name leu-bot
pm2 save
pm2 startup        # follow the printed instruction to run on boot
```

Logs: `pm2 logs leu-bot` · Restart: `pm2 restart leu-bot`

---

## 🎨 Customising

Everything the bot builds lives in **`src/structure.js`** — edit the roles, game
list, categories and channels there, then run `/setup` again. To add a game, add
it to `GAME_ROLES` (it gets a locked hub channel automatically); to give a game
its own full category, add it to `FEATURED_GAMES` and set `channel: false,
featured: true` on its role. Embed colours and
the community name come from `.env` (`BRAND_COLOR`, `COMMUNITY_NAME`).

Panels' wording lives in `src/panels.js`; the rules text is in `rulesPanel()`.

---

## 📂 Project layout
```
leu-bot/
├─ index.js              # entry point: loads commands/events, logs in
├─ .env                  # your secrets (not committed)
├─ data/db.json          # persisted state (ids, tickets, warnings, scrims)
└─ src/
   ├─ config.js          # env loader
   ├─ structure.js       # ⬅ server blueprint (edit me)
   ├─ panels.js          # interactive panel builders
   ├─ components.js      # button / select / modal router
   ├─ database.js        # tiny JSON store
   ├─ deploy.js          # manual command registration
   ├─ utils/             # embeds, helpers
   ├─ events/            # ready, interactionCreate, guildMemberAdd
   └─ commands/          # setup, mod, scrim, tournament, lfg, roster,
                         #   announce, status, panel, help, reset
```

---

## ⚠️ Commands quick reference
`/setup` · `/cleanup` · `/reset` · `/panel` · `/status` · `/help`
`/mod warn|warnings|clearwarns|timeout|untimeout|kick|ban|unban|purge`
`/scrim` · `/tournament` · `/lfg` · `/roster` · `/announce`
`/rank` · `/leaderboard` · `/poll` · `/userinfo` · `/serverinfo` · `/embed`
`/musicquiz` · `/movienight` · `/refreshpanels`
