# Publish Burn Report

Publish the latest Burn Report from the user's desktop to the Franchise Mode site.

## Steps

1. **Read the latest burn report** from `C:\Users\jdubb\OneDrive\Desktop\FF\BurnReport.md`.

2. **Determine the week number** from the report content (look for "Week X" in the heading or title).

3. **Read the current `burn.html`** at `C:\Users\jdubb\OneDrive\Development\AIDev\FantasyFootball\burn.html`.

4. **Identify the currently displayed report** in burn.html (the content inside `<main class="report">`). Determine its week number from its `week-label` div.

5. **Archive the current report**: The current `<main class="report">` section becomes a hidden archived section. Change its tag to `<section class="report" id="weekN" hidden>` (where N is the old week number) and place it right after the closing `</aside>` of the archive sidebar, before the closing `</div>` of `.content-layout`. Keep all its content intact.

6. **Build the new report** as the new `<main class="report">` section using the content from BurnReport.md. Follow the exact same HTML structure as the existing report:
   - `<div class="week-label">Week X</div>` 
   - `<div class="season-label">2026 Season · Franchise Mode</div>`
   - Opening paragraph as `<p class="intro">...</p>`
   - Matchup tables use the `.matchup-table-wrap` / `.matchup-table` structure
   - Standings tables use the `.standings-wrap` / `.standings-table` structure
   - Each franchise spotlight gets a `.spotlight` card with `.franchise`, `.roast`, and `.goal` divs
   - Section headings use `<h2>` tags
   - The footer note uses `<p class="footer-note">`
   - The new report's id should be `weekX` where X is the new week number

7. **Update the archive sidebar**: Add a new `<li>` at the TOP of the `.archive-list` for the new week with class `current`. Remove `class="current"` from the previous week's link. Each archive link should have an `onclick` handler that shows/hides reports:
   ```html
   <li><a href="#weekX" onclick="showWeek('weekX')" class="current">Week X</a></li>
   ```

8. **Add the week-switching JavaScript** (if not already present) at the bottom of burn.html, before the closing comments:
   ```javascript
   function showWeek(id) {
     document.querySelectorAll('.report').forEach(r => {
       if (r.id === id) { r.hidden = false; r.tagName === 'SECTION' || null; }
       else { r.hidden = true; }
     });
     document.querySelectorAll('.archive-list a').forEach(a => {
       a.classList.toggle('current', a.getAttribute('href') === '#' + id);
     });
   }
   ```
   Note: The current/latest week's report uses `<main class="report">`, archived weeks use `<section class="report" hidden>`. The showWeek function should handle both by toggling the `hidden` attribute.

9. **Commit and push** the changes with a descriptive commit message like "Publish Burn Report: Week X".

## Important Notes

- Preserve ALL existing archived reports when adding new ones. Never remove old archive sections.
- The newest report is always the visible `<main>` element. All older reports are `<section hidden>`.
- Archive sidebar links should be ordered newest first (top) to oldest (bottom).
- Parse the markdown content carefully — translate markdown tables to the HTML table structures, bold text to `<strong>`, italic to `<em>`, etc.
- If the burn report contains a "Franchise Spotlight" or similar per-team section, render each team as a `.spotlight` card.
- After pushing, remind the user that Vercel will auto-deploy.
