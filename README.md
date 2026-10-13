# 💸 Pennywise – Smart Budget Tracker

A beautiful, fast and private budgeting app that runs entirely in your browser.
No build step, no dependencies, no backend – just static files, so it works on GitHub Pages out of the box.

## Features

- **Track income & expenses** with categories, dates and descriptions
- **Animated dashboard** – count-up totals, a live donut chart, progress bars and a 6-month trend chart
- **Category budgets** – click any limit to edit it; bars turn amber/red as you approach or exceed it
- **Daily spending guide** – shows how much you can safely spend per day for the rest of the month
- **Month navigation** (buttons or ← / → keys), search and income/expense filters
- **Undo delete**, **CSV export**, demo data and one-click reset
- **7 currencies**, light & dark themes (follows your system, remembers your choice)
- Fully **responsive**, keyboard accessible, and honours `prefers-reduced-motion`
- Your data is stored only in your browser's `localStorage`

## Run it

Open `index.html` in a browser – that's it. Or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Host it on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select your branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
4. After a minute your app is live at `https://<your-username>.github.io/<repo-name>/`.

All asset paths are relative, so it works under a project sub-path with no configuration.

## Project structure

```
index.html        # markup
css/style.css     # design system, layout and animations
js/app.js         # state, rendering and interactions
assets/favicon.svg
```

## License

MIT
