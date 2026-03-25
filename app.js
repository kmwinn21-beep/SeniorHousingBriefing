/**
 * Senior Housing News Daily Briefings
 * app.js — core application logic
 *
 * Data flow:
 *  1. On load, fetch briefings/manifest.json
 *  2. Populate filter dropdowns from manifest metadata
 *  3. Render sidebar list (sorted newest first)
 *  4. Auto-load the most recent briefing into main content
 *  5. Re-filter list on any search/filter change
 *  6. On list item click, fetch & render that briefing's HTML file
 */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  allBriefings: [],       // full manifest array
  filtered: [],           // after filters applied
  activeId: null,         // currently displayed briefing id
  filters: {
    search: '',
    year: '',
    month: '',
    category: '',
    source: '',
    company: '',
  },
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput      = $('search-input');
const searchClear      = $('search-clear');
const filterYear       = $('filter-year');
const filterMonth      = $('filter-month');
const filterCategory   = $('filter-category');
const filterSource     = $('filter-source');
const filterCompany    = $('filter-company');
const clearFiltersBtn  = $('clear-filters-btn');
const briefingsList    = $('briefings-list');
const resultsCount     = $('results-count');
const briefingCount    = $('briefing-count');
const contentLoading   = $('content-loading');
const briefingContainer = $('briefing-container');
const briefingBody     = $('briefing-body');
const briefingDateBadge = $('briefing-date-badge');
const briefingTags     = $('briefing-tags');
const emptyState       = $('empty-state');
const btnResetEmpty    = $('btn-reset-empty');

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function formatDate(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-');
  return `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${MONTHS[parseInt(m,10)-1].slice(0,3)} ${parseInt(d,10)}, ${y}`;
}

function unique(arr) {
  return [...new Set(arr)].filter(Boolean).sort();
}

function collectFromManifest(key) {
  const all = [];
  state.allBriefings.forEach(b => {
    if (Array.isArray(b[key])) all.push(...b[key]);
  });
  return unique(all);
}

function collectYears() {
  return unique(state.allBriefings.map(b => b.date.slice(0,4)));
}

// ── Fetch manifest ─────────────────────────────────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch('briefings/manifest.json?_=' + Date.now());
    if (!res.ok) throw new Error('Failed to load manifest');
    const data = await res.json();
    // Sort newest first
    state.allBriefings = (data.briefings || []).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (err) {
    console.error('Manifest load error:', err);
    state.allBriefings = [];
  }
}

// ── Populate filter dropdowns ──────────────────────────────────────────────
function populateFilters() {
  // Year
  const years = collectYears();
  filterYear.innerHTML = '<option value="">All Years</option>' +
    years.reverse().map(y => `<option value="${y}">${y}</option>`).join('');

  // Category
  const cats = collectFromManifest('categories');
  filterCategory.innerHTML = '<option value="">All Categories</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  // Source
  const sources = collectFromManifest('sources');
  filterSource.innerHTML = '<option value="">All Sources</option>' +
    sources.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');

  // Company
  const companies = collectFromManifest('companies');
  filterCompany.innerHTML = '<option value="">All Companies</option>' +
    companies.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  // Total count
  briefingCount.textContent = `${state.allBriefings.length} Briefing${state.allBriefings.length !== 1 ? 's' : ''}`;
}

// ── Filter logic ───────────────────────────────────────────────────────────
function applyFilters() {
  const { search, year, month, category, source, company } = state.filters;
  const q = search.toLowerCase().trim();

  state.filtered = state.allBriefings.filter(b => {
    if (year   && b.date.slice(0,4) !== year)     return false;
    if (month  && b.date.slice(5,7) !== month)    return false;
    if (category && !(b.categories || []).includes(category)) return false;
    if (source   && !(b.sources    || []).includes(source))   return false;
    if (company  && !(b.companies  || []).includes(company))  return false;
    if (q) {
      const searchable = [
        b.title,
        b.date,
        ...(b.categories || []),
        ...(b.sources    || []),
        ...(b.companies  || []),
        b.summary || '',
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  renderList();
}

// ── Render sidebar list ────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderList() {
  resultsCount.textContent = state.filtered.length;

  if (state.filtered.length === 0) {
    briefingsList.innerHTML = '<li class="list-empty">No briefings match your filters.</li>';
    showEmptyState();
    return;
  }

  briefingsList.innerHTML = state.filtered.map(b => {
    const active = b.id === state.activeId ? ' active' : '';
    const cats   = (b.categories || []).slice(0,3);
    return `
      <li class="briefing-list-item${active}" data-id="${esc(b.id)}" role="button" tabindex="0"
          aria-label="View briefing for ${esc(formatDate(b.date))}">
        <div class="bli-date">${esc(formatDateShort(b.date))}</div>
        <div class="bli-title">${esc(b.title)}</div>
        ${cats.length ? `<div class="bli-cats">${cats.map(c => `<span class="bli-cat-tag">${esc(c)}</span>`).join('')}</div>` : ''}
      </li>`.trim();
  }).join('');

  // Re-attach click handlers
  briefingsList.querySelectorAll('.briefing-list-item').forEach(el => {
    el.addEventListener('click', () => loadBriefing(el.dataset.id));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') loadBriefing(el.dataset.id); });
  });
}

// ── Fetch & render a briefing ──────────────────────────────────────────────
async function loadBriefing(id) {
  if (state.activeId === id) return;
  state.activeId = id;

  const meta = state.allBriefings.find(b => b.id === id);
  if (!meta) return;

  // Update active state in list
  briefingsList.querySelectorAll('.briefing-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Show loading
  showLoading();

  try {
    const res = await fetch(meta.file + '?_=' + Date.now());
    if (!res.ok) throw new Error('Briefing file not found: ' + meta.file);
    const html = await res.text();
    renderBriefing(meta, html);
  } catch (err) {
    console.error('Briefing load error:', err);
    briefingBody.innerHTML = `
      <div style="padding:40px;text-align:center;color:#888;">
        <p>Could not load this briefing. Please try again.</p>
        <small style="font-size:0.75rem;color:#aaa;">${esc(err.message)}</small>
      </div>`;
    showBriefing();
  }
}

function renderBriefing(meta, html) {
  // Date badge
  briefingDateBadge.textContent = formatDate(meta.date);

  // Tags
  const tags = [
    ...(meta.categories || []).map(c => `<span class="briefing-tag cat">${esc(c)}</span>`),
    ...(meta.sources    || []).map(s => `<span class="briefing-tag source">${esc(s)}</span>`),
    ...(meta.companies  || []).map(c => `<span class="briefing-tag company">${esc(c)}</span>`),
  ];
  briefingTags.innerHTML = tags.join('');

  // Strip the metadata <script> tag if present, inject the rest
  const stripped = html.replace(/<script[^>]*id="briefing-meta"[^>]*>[\s\S]*?<\/script>/i, '');
  briefingBody.innerHTML = stripped;

  showBriefing();

  // Scroll main content to top
  document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Show/hide states ───────────────────────────────────────────────────────
function showLoading() {
  contentLoading.style.display    = 'flex';
  briefingContainer.style.display = 'none';
  emptyState.style.display        = 'none';
}

function showBriefing() {
  contentLoading.style.display    = 'none';
  briefingContainer.style.display = 'block';
  emptyState.style.display        = 'none';
}

function showEmptyState() {
  contentLoading.style.display    = 'none';
  briefingContainer.style.display = 'none';
  emptyState.style.display        = 'flex';
}

// ── Event listeners ────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  state.filters.search = searchInput.value;
  searchClear.classList.toggle('visible', searchInput.value.length > 0);
  applyFilters();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.filters.search = '';
  searchClear.classList.remove('visible');
  applyFilters();
});

filterYear.addEventListener('change',     () => { state.filters.year     = filterYear.value;     applyFilters(); });
filterMonth.addEventListener('change',    () => { state.filters.month    = filterMonth.value;    applyFilters(); });
filterCategory.addEventListener('change', () => { state.filters.category = filterCategory.value; applyFilters(); });
filterSource.addEventListener('change',   () => { state.filters.source   = filterSource.value;   applyFilters(); });
filterCompany.addEventListener('change',  () => { state.filters.company  = filterCompany.value;  applyFilters(); });

function resetAllFilters() {
  state.filters = { search: '', year: '', month: '', category: '', source: '', company: '' };
  searchInput.value = '';
  searchClear.classList.remove('visible');
  filterYear.value = '';
  filterMonth.value = '';
  filterCategory.value = '';
  filterSource.value = '';
  filterCompany.value = '';
  applyFilters();
  // Reload the most recent briefing if there is one
  if (state.allBriefings.length > 0) {
    loadBriefing(state.allBriefings[0].id);
  }
}

clearFiltersBtn.addEventListener('click', resetAllFilters);
btnResetEmpty.addEventListener('click', resetAllFilters);

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  await loadManifest();
  populateFilters();
  applyFilters();

  // Auto-load the most recent briefing
  if (state.filtered.length > 0) {
    loadBriefing(state.filtered[0].id);
  } else {
    showEmptyState();
  }
}

init();
