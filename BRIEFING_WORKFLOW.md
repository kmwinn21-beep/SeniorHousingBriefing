# Daily Briefing Workflow Instructions

## Overview

Each daily briefing consists of two files:

1. `briefings/YYYY-MM-DD.html` — the briefing content (HTML snippet, **not** a full HTML document)
2. `briefings/manifest.json` — the master index of all briefings (must be updated each run)

---

## Step 1: Generate the Briefing HTML File

Save the generated briefing as `briefings/YYYY-MM-DD.html` (e.g. `briefings/2026-03-26.html`).

### Required structure

The file must begin with a metadata block followed by the briefing content:

```html
<!-- BRIEFING METADATA — Do not remove. Used by the manifest update workflow. -->
<script type="application/json" id="briefing-meta">
{
  "id": "YYYY-MM-DD",
  "date": "YYYY-MM-DD",
  "title": "Senior Housing News Daily Briefing — Month DD, YYYY",
  "summary": "One or two sentence summary of today's key themes.",
  "categories": ["Finance & Capital Markets", "Workforce", "Development"],
  "sources": ["Senior Housing News", "McKnight's Senior Living"],
  "companies": ["Company A", "Company B"]
}
</script>

<!-- BRIEFING CONTENT -->
<h1>Senior Housing News Daily Briefing</h1>
<p class="briefing-tagline">Weekday, Month DD, YYYY &nbsp;&bull;&nbsp; Compiled from leading industry sources</p>

... rest of briefing content ...
```

### Metadata fields

| Field        | Type             | Description |
|--------------|------------------|-------------|
| `id`         | string           | Same as the date: `YYYY-MM-DD` |
| `date`       | string           | ISO date: `YYYY-MM-DD` |
| `title`      | string           | Full briefing title |
| `summary`    | string           | 1–2 sentence summary (used in search) |
| `categories` | array of strings | High-level topic buckets (see list below) |
| `sources`    | array of strings | Publication names cited |
| `companies`  | array of strings | Company names mentioned in the briefing |

### Canonical category names (use these consistently for filtering)

- `Finance & Capital Markets`
- `Mergers & Acquisitions`
- `Development`
- `Workforce`
- `Operations`
- `Policy & Regulation`
- `Technology`
- `Skilled Nursing`
- `Memory Care`
- `Independent Living`
- `Assisted Living`
- `CCRCs / Life Plan Communities`

---

## Step 2: Update briefings/manifest.json

Add the new briefing as the **first** item in the `briefings` array (newest first).

```json
{
  "briefings": [
    {
      "id": "YYYY-MM-DD",
      "date": "YYYY-MM-DD",
      "title": "Senior Housing News Daily Briefing — Month DD, YYYY",
      "file": "briefings/YYYY-MM-DD.html",
      "summary": "One or two sentence summary.",
      "categories": ["Finance & Capital Markets", "Workforce"],
      "sources": ["Senior Housing News"],
      "companies": ["Company A"]
    },
    ... existing entries below ...
  ]
}
```

---

## Step 3: Commit and push

```bash
git add briefings/YYYY-MM-DD.html briefings/manifest.json
git commit -m "Add daily briefing for YYYY-MM-DD"
git push origin claude/senior-housing-news-page-31pQy
```

---

## HTML Content Guidelines

### News item block

```html
<div class="news-item">
  <div class="news-item-source">Source Name</div>
  <div class="news-item-headline">Headline Here</div>
  <div class="news-item-summary">
    2–4 sentence summary of the story.
  </div>
  <div class="news-item-companies">
    <span class="company-pill">Company Name</span>
  </div>
</div>
```

### Section header

```html
<h2>Section Title</h2>
```

### Summary / at-a-glance box

```html
<div class="summary-box">
  <h2>Today at a Glance</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value">6</div>
      <div class="stat-label">Stories Today</div>
    </div>
    <!-- add more stat-cards as needed -->
  </div>
  <p>Brief narrative overview of the day's themes.</p>
</div>
```

### Quote / pull quote

```html
<blockquote>
  "Quote text here." — Person Name, Title
</blockquote>
```

### Bullet roundup ("In Brief")

```html
<h2>In Brief</h2>
<ul>
  <li><strong>Company</strong> did something notable.</li>
</ul>
```
