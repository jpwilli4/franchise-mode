# Publish Pick'em Slate

Read the latest Pick'em slate and publish it to the Franchise Mode site.

## Steps

1. **Read the slate file** from `C:\Users\jdubb\OneDrive\Desktop\FF\pickemslatelatest.md`.

2. **Parse the file** to extract:
   - The NFL week number (e.g., "Week 1")
   - The season year (e.g., 2026)
   - The games grouped by day (Thursday, Sunday, Monday), each with: away team, home team, and kickoff time
   - Use the team names exactly as written in the file — these must match ESPN's `shortDisplayName` for the cron auto-scorer to work (e.g., "Bears", "Packers", "Chiefs", etc.)

3. **Read the current `pickem.html`** at `C:\Users\jdubb\OneDrive\Development\AIDev\FantasyFootball\pickem.html`.

4. **Check if there's an existing slate** by looking at the `CURRENT_WEEK` variable in the script. If `CURRENT_WEEK > 0`, the current slate needs to be archived.

5. **Archive the current slate's games to Firebase** (if one exists):
   - Parse the current `GAMES` array and `CURRENT_WEEK` from pickem.html
   - Write the old week's games to Firebase at `pickem/{season}/week{oldWeek}/games` so the archive sidebar can load them:
     ```bash
     curl -X PUT "https://franchise-mode-pickem-default-rtdb.firebaseio.com/pickem/2026/week1/games.json" \
       -d '{"game1":{"away":"Bears","home":"Packers","day":"Sunday","time":"Sun 1:00 PM"},...}'
     ```
   - Include `day` and `time` fields in each game object so archived weeks render correctly
   - Past picks and results already live in Firebase and are preserved automatically

6. **Update the GAMES array, CURRENT_WEEK, and PICKS_DEADLINE** in the `<script>` section of `pickem.html`:
   - Set `CURRENT_WEEK` to the new week number
   - Set `SEASON` to the correct year
   - Set `PICKS_DEADLINE` to the Sunday (or first game day) of that week at `08:00:00-07:00` (8am Pacific Time). Format: ISO 8601 string, e.g. `'2026-09-13T08:00:00-07:00'`. Use `-07:00` for PDT (Mar–Nov) or `-08:00` for PST (Nov–Mar).
   - Populate the `GAMES` array with the parsed games. Each game object:
     ```javascript
     { id: 'game1', away: 'Bears', home: 'Packers', day: 'Sunday', time: 'Sun 1:00 PM' }
     ```
   - Games should be numbered sequentially: game1, game2, game3, etc.
   - The `day` field groups games visually on the page
   - The `time` field shows the kickoff time

7. **Write the game data to Firebase** for the auto-scoring cron job AND archive. Two writes:
   - **Active slate** (for cron auto-scorer):
     ```bash
     curl -X PUT "https://franchise-mode-pickem-default-rtdb.firebaseio.com/pickem/active.json" \
       -d '{"season":2026,"week":1,"nflWeek":1,"games":{"game1":{"away":"Bears","home":"Packers"},...}}'
     ```
   - **Week-specific games** (for archive sidebar):
     ```bash
     curl -X PUT "https://franchise-mode-pickem-default-rtdb.firebaseio.com/pickem/2026/week1/games.json" \
       -d '{"game1":{"away":"Bears","home":"Packers","day":"Sunday","time":"Sun 1:00 PM"},...}'
     ```
   - `season`: the season year
   - `week`: the Pick'em week number (matches CURRENT_WEEK)
   - `nflWeek`: the NFL week number (usually the same, but could differ if the Pick'em skips a week)
   - `games`: object mapping game IDs to `{away, home, day, time}` — team names must match what's in the GAMES array

8. **Commit and push** with message like "Publish Pick'em slate: Week X, YYYY".

9. **Remind the user** that:
   - The slate is live — franchises can now visit the Pick'em page to make their picks
   - The auto-scorer cron runs Tuesday at 6am EST to pull final scores from ESPN
   - If the cron fails, the commissioner panel (password: `fm2026`) is the manual fallback

## Slate File Format

The file at `pickemslatelatest.md` should follow a format like:

```
# Week 1 - 2026

## Thursday
Chiefs @ Ravens - 8:15 PM

## Sunday
Bears @ Packers - 1:00 PM
Vikings @ Lions - 1:00 PM
Bengals @ Browns - 1:00 PM
...

## Monday
Jets @ Cowboys - 8:15 PM
```

If the format varies, parse it flexibly — the key data is: week number, team names, day grouping, and kickoff times.

## Important Notes

- Team names in the GAMES array must use ESPN's `shortDisplayName` format (e.g., "Bears" not "Chicago Bears", "49ers" not "San Francisco 49ers") for the auto-scorer to match correctly.
- Always write the Firebase active slate data so the cron job knows what to score.
- The Pick'em page resets for each new slate — franchises submit fresh picks per week.
