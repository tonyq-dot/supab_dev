# KPI Telegram Bot

Telegram bot for the KPI system. Lets animators add work logs and check KPI status directly from Telegram.

## Commands

| Command | Description |
|---|---|
| `/start` | Welcome message + command list |
| `/help` | Full command reference |
| `/link <CODE>` | Link Telegram account to Supabase user |
| `/status` | Current quarter KPI: points, norm, progress |
| `/projects` | List active projects |
| `/addwork` | Guided wizard to log a work entry |
| `/myworks` | Last 10 work log entries |
| `/cancel` | Cancel any active wizard |

---

## Setup

### 1. Create a bot

Open [@BotFather](https://t.me/BotFather) in Telegram and run:

```
/newbot
```

Save the token it gives you.

### 2. Register slash commands with BotFather

Send to @BotFather:

```
/setcommands
```

Select your bot, then paste:

```
start - Приветствие и список команд
help - Список команд
link - Привязать Telegram к аккаунту (/link КОД)
status - Мой KPI за текущий квартал
projects - Список активных проектов
addwork - Добавить работу (мастер)
myworks - Последние 10 записей
cancel - Отменить текущее действие
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
TELEGRAM_BOT_TOKEN=<from BotFather>
SUPABASE_URL=<same as VITE_SUPABASE_URL in the web app>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Settings → API → service_role>
BOT_USERNAME=<your bot's @username without @>
```

Also add `VITE_TELEGRAM_BOT_USERNAME=<your_bot_username>` to the **web app's** `.env`
so the Profile page can show the correct bot link.

### 4. Run the DB migration

In Supabase Dashboard → SQL Editor, run:

```
supabase/migrations/20250228000001_telegram_integration.sql
```

Or via CLI:

```bash
npx supabase db push
```

### 5. Install dependencies and start

```bash
cd bot
npm install
npm start
```

---

## Deployment on the VPS (PM2)

The bot runs as a separate PM2 process on the same VPS as `lumalance4`.

### Add to PM2 ecosystem

Edit `/var/www/lumalance4/ecosystem.config.cjs` and add a second app block:

```js
module.exports = {
  apps: [
    {
      // ... existing lumalance-app block ...
    },
    {
      name: 'kpi-bot',
      script: 'node',
      args: 'bot/index.js',
      cwd: '/var/www/kpi-system',   // path where you deploy this project
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      log_file: './logs/kpi-bot.log',
      out_file: './logs/kpi-bot-out.log',
      error_file: './logs/kpi-bot-error.log',
      merge_logs: true,
      time: true,
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      max_memory_restart: '200M',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
```

### Deploy and start

```bash
# On the VPS, in the project directory
cd /var/www/kpi-system
git pull
cd bot && npm install --production && cd ..

# Start (or reload if already running)
pm2 start ecosystem.config.cjs --only kpi-bot
# or if updating:
pm2 reload ecosystem.config.cjs --only kpi-bot

pm2 save
```

### Useful PM2 commands

```bash
pm2 status                         # see all processes
pm2 logs kpi-bot --lines 50        # recent logs
pm2 restart kpi-bot                # restart
pm2 stop kpi-bot                   # stop
```

---

## How account linking works

1. User opens **Profile** in the web app → clicks **Привязать Telegram**
2. App generates a one-time 8-char code (stored in `telegram_link_tokens`, expires in 10 min)
3. User sends `/link ABCD1234` to the bot
4. Bot validates the token, writes `telegram_id → user_id` to `telegram_links`, deletes the token
5. User is now linked — all bot commands work with their Supabase account

---

## Phase 2: AI assistant (planned)

Add `openai` dep and a `handlers/ai.js` handler that:
- Catches unrecognised text from linked users
- Sends message + current projects/work types to `gpt-4o-mini`
- Parses structured JSON response
- Confirms action with the user before saving

No architecture change required — just a new handler registered in `index.js`.
