# Pennywise · Smart Budget Tracker

A private personal-finance app that runs entirely in your browser. It doesn't just show your numbers. It forecasts your month, scores your financial health, and tells you what to do next.

No build step, no dependencies, no backend: static files that host anywhere, including GitHub Pages.

## What's inside

| Area | Highlights |
| --- | --- |
| **Dashboard** | Balance, income, expenses and savings rate with sparklines · month-end **forecast** · **financial health score** · prioritised **insights** · cash flow · spending donut · budgets, goals, upcoming bills |
| **Transactions** | Search, type/category filters, sorting, month or all-time scope, grouped by day · add, **edit**, delete with undo |
| **Budgets** | Per-category limits with projection and 6-month trend · "set limits from my 3-month average" · **recurring bills & subscriptions** that post automatically · subscription detection |
| **Goals** | Savings goals with progress rings, required monthly amount, projected finish date and on-track status |
| **Insights** | Spending pace vs. budget · **what-if simulator** · category trends · weekday rhythm · top spending |
| **Settings** | Dark / light / system theme · 10 currencies · CSV export · JSON backup & restore · sample data · reset |

Also: collapsible sidebar (bottom tab bar on mobile), **⌘/Ctrl + K** command palette, `N` to add a transaction, `←` `→` to change month, budget alerts as you spend, empty states everywhere, keyboard and screen-reader friendly, `prefers-reduced-motion` respected.

## How the smart parts work

- **Forecast** = spent so far + upcoming recurring bills + your daily variable-spending pace (blended with your 3-month history so early-month numbers aren't noisy). Fixed bills are never extrapolated.
- **Health score (0–100)** = savings rate (35) + budget adherence (30) + spending stability (15) + safety buffer (20).
- **Insights** are plain rules over your data: over/near-budget categories, spending above your average, savings-rate commentary, goals behind schedule, thin buffer, and repeating charges worth tracking.

## Run it

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Host on GitHub Pages

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Choose your branch and **/ (root)**, then **Save**.

Everything uses relative paths and hash routing (`#/budgets`), so it works under `https://<user>.github.io/<repo>/` with no configuration.

## Privacy

There is no account and no server. Data lives in your browser's `localStorage` under `pennywise.v1`. Use **Settings → Download backup** to move it between devices. Data from the first version of Pennywise is kept and upgraded automatically.

## Structure

```
index.html          app shell
css/style.css       design system, layout, animation
js/core.js          state, persistence, forecast, health score, insights engine
js/ui.js            icons, charts, modal, toast, tooltip, command palette
js/transactions.js  transactions view + add/edit dialog
js/dashboard.js     dashboard view
js/budgets.js       budgets, recurring bills
js/goals.js         savings goals
js/insights.js      insights, charts, what-if
js/settings.js      settings, import/export
js/app.js           router, theme, shortcuts
```

## License

MIT
