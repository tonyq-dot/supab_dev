# Telegram Bot Integration

This directory contains the Telegram bot integration for the LumaLance platform. The bot provides notifications and allows users to interact with the platform directly from Telegram.

## Features

- **Authentication**: Users can link their Telegram accounts to their LumaLance accounts
- **Project Management**: Create projects directly from Telegram
- **Proposal Management**: View and manage proposals for projects
- **Notifications**: Receive notifications for new proposals, proposal status changes, and messages
- **Forward Collection**: Create projects from forwarded messages

## Directory Structure

- `bot.js`: Main bot instance and configuration
- `index.js`: Bot startup and error handling
- `notifications.js`: Functions for sending notifications to users
- `handlers/`: Command and message handlers
  - `commands.js`: Basic command handlers (start, help, status)
  - `projects.js`: Project-related command handlers
  - `proposals.js`: Proposal-related command handlers
  - `forward.js`: Forward message collection handlers

## Commands

- `/start`: Show welcome message and available commands
- `/help`: Show help message with available commands
- `/status`: Check if your Telegram account is linked to LumaLance
- `/post`: Create a new project
- `/projects`: List your projects
- `/proposals`: View proposals for your projects
- `/myproposals`: View proposals you've submitted
- `/forward`: Create a project from forwarded messages

## Environment Variables

The following environment variables are required for the Telegram bot to function:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
- `TELEGRAM_BOT_USERNAME`: Your Telegram bot username (without @)
- `FRONTEND_URL`: URL of the frontend application (for generating links)

## Setup

1. Create a Telegram bot using BotFather
2. Set the required environment variables
3. Start the server with `npm run dev` or `npm start`

## Integration with Other Components

The Telegram bot is integrated with the following components:

- **Authentication**: Users can link their Telegram accounts in the profile page
- **Projects**: Project creation and management
- **Proposals**: Proposal submission and management
- **Messages**: Notification of new messages

## Extending the Bot

To add new commands or features to the bot:

1. Create a new handler file in the `handlers/` directory
2. Register the handler in `bot.js`
3. Update the command list in `handlers/commands.js`

## Troubleshooting

- **Bot not responding**: Check if the `TELEGRAM_BOT_TOKEN` is set correctly
- **Authentication issues**: Ensure the user has linked their Telegram account in the web app
- **Command errors**: Check the server logs for detailed error messages
