# Bridge Pairs

Phone-based scoring for small duplicate bridge pairs games. The director creates a
tournament with the boards in play (gaps are fine, e.g. `10-13, 16-19`) and shares the
6-digit join code or QR code. Players join an existing pair or register their own partnership
under a pair name, then enter each contract and result from their phones. The app matchpoints everything as results come in.

- **Movements (optional):** Howell for 4–14 pairs and Mitchell for any field of 5+ pairs,
  with sit-outs for odd numbers. You can also play with no movement and enter results freely.
- **Scoring:** contract scores per Law 77, matchpoints (1 per pair beaten, ½ per tie), and
  the Neuberg formula for boards played fewer times. Adjusted scores A+/A/A− follow Law 12C2.
- **Editing:** players can edit any result on a board their pair played. The director can
  edit everything, including pairs, boards, the movement, finishing/reopening the game and
  adjusted scores. The director can log in on another phone with the director PIN.
- **Fair play:** you only see a board's results (the traveller) after you've entered your
  own result on it. Standings and matchpoints stay hidden from players until the director
  presses Finish; the director sees them provisionally on the Manage page.

## Development

```sh
npm install
npm run db:push   # creates ./local.db
npm run dev       # http://localhost:3000 (use your LAN IP to try it on a phone)
npm test          # scoring / matchpoint / movement tests
```

## Deploying on Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add **Turso** from the Vercel Marketplace (Storage tab). This sets `TURSO_DATABASE_URL`
   and `TURSO_AUTH_TOKEN`.
3. Create the tables once from your machine:
   `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:push`
4. Deploy. Run `db:push` again whenever `db/schema.ts` changes.

## Layout

- `lib/bridge/`: pure bridge logic (scoring, matchpoints, movements, formatting)
- `lib/actions.ts`: server actions (all permission checks)
- `lib/view.ts`: per-viewer tournament data, polled by phones via `/api/t/[code]`
- `db/schema.ts`: Drizzle schema (libSQL / Turso)
- `app/t/[code]/`: Play, Results, Boards, Movement, Manage and score-entry screens
