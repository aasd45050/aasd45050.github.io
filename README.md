# ORB1TAL

A static game website with an admin page. Statuses and game order are shared with every visitor through a Supabase table and Edge Function.

## Supabase setup (once)

1. Create a project at supabase.com. Note the **Project Reference** (the part of the project URL before `.supabase.co`).
2. In the Supabase dashboard, open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. From this folder, in a terminal:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase secrets set ADMIN_PASSWORD=your-password
   npx supabase functions deploy orb1tal-api --no-verify-jwt
   ```
4. Open `assets/js/config.js` and replace `YOUR-PROJECT-REF` with your Project Reference.
5. Upload the website files to any static host (for example Cloudflare Pages, Netlify or GitHub Pages).

## Admin

Double-click the "1" in the heading to open `admin.html`, then log in with the admin password.

- Change a game's status with the dropdown.
- Reorder games by pressing and holding the grip (⋮⋮) on the left and dragging.

Changes are saved on the server and visitors see them within about 30 seconds.

## Add a game

1. Add the game's folder under `games/`.
2. Add an entry to `assets/js/games.js`. Set its `id` to the folder name and its initial status.

Statuses and order saved in admin override the defaults in `games.js`.
