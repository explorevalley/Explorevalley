# ExploreValley

Monorepo scaffold for ExploreValley (Expo app + Express server + shared schemas).

Install & run (quick):

1. Install deps: `npm install`
2. Build shared types: `npm --workspace @explorevalley/shared run build`
3. Run server: `npm run dev:server`
4. Run app: `npm run dev:app` or `npm run dev:web`

Admin content

- The project starts with an empty dataset. Add content (tours, hotels, menu items) using the Telegram admin bot.
- Start the server with `npm run dev:server` and ensure `server/.env` contains `TELEGRAM_BOT_TOKEN` and `ADMIN_CHAT_IDS`.
- From the admin Telegram account, send `/addtour` or `/addhotel` and follow the interactive prompts.

