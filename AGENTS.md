# Repository Guidelines

## Project Structure & Module Organization
This repo hosts two standalone interactive Gantt chart pages. `gantt.html` is the generic weekly planner for 2025–2028, and `ganttMurat.html` is the personalized variant referenced from README.md. Both files inline their CSS variables inside `<style>` and rendering logic inside `<script>` blocks, so edits stay scoped to a single file. Shared helpers such as `getISOWeek`, the `tasks` array, and DOM generation live near the bottom; keep helper blocks grouped and documented with the existing `// === Section ===` comments for easy scanning.

## Build, Test, and Development Commands
- `python3 -m http.server 8000` — serve the repo locally and preview via `http://localhost:8000/gantt.html`.
- `open gantt.html` (macOS) or `xdg-open gantt.html` — launch the static file directly in a browser for quick spot checks.
- `npx prettier --check "*.html"` — optional formatting sanity check; run `--write` before committing if spacing drifts.

## Coding Style & Naming Conventions
Use 2-space indentation across HTML, CSS, and JS to match the current files. Keep CSS custom properties declared at the top of `:root`, and group layout rules before component-specific selectors. JavaScript helpers should use `camelCase` names (`getWeeksInYear`, `isBetweenWeeks`) and prefer `const` with arrow functions unless `function` hoisting is required for readability. DOM templates rely on template literals (``${w.year}-W${w.week}``); maintain that pattern for any new cells or annotations.

## Testing Guidelines
Always verify both HTML variants in a modern Chromium or Firefox build after edits. Confirm week headers, task spans, and the “today” column all align by toggling system dates or temporarily overriding `today` values in the console. When adjusting timelines, spot-check keyboard scrolling and ensure horizontal overflow still centers on the current week. Capture console output; the pages should remain warning-free. If you introduce automation, mirror manual checks in a smoke-test script that loads the file via Playwright and inspects the DOM.

## Commit & Pull Request Guidelines
Follow the terse, imperative commit style already in history (`Update ganttMurat.html`, `Add link to ...`). Each PR should include: purpose summary, key screenshots or screen recordings of the updated chart, reproduction steps, and any GitHub Pages preview link. Reference related issues or tasks, note accessible color choices, and call out data changes (new tasks, shifted weeks) so reviewers can validate quickly.

## Deployment & Hosting Notes
Publishing happens through GitHub Pages (`https://kilcimurat.github.io/ganttChart`). After merging to `main`, allow a few minutes for the CDN to refresh, then manually check both HTML endpoints. If assets are renamed, update the README links and confirm the live pages still load styles and scripts without mixed-content warnings.
