/**
 * Senior Housing News Daily Briefings — app.js
 *
 * Data flow:
 *  1. Fetch briefings/manifest.json
 *  2. Populate sidebar filter dropdowns from manifest metadata
 *  3. Render sidebar list sorted newest → oldest
 *  4. Auto-load the most recent briefing
 *  5. Tags at the bottom of each briefing are clickable filter buttons
 *     that sync with the sidebar dropdowns and re-filter the list
 */

'use strict';

// ── State ───────────────────────────────────────────────────────────────────
const state = {
  allBriefings: [],
  filtered:     [],
  activeId:     null,
  filters: {
    search:   '',
    year:     '',
    month:    '',
    category: '',
    source:   '',
    company:  '',
  },
};

// ── DOM refs ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput       = $('search-input');
const searchClear       = $('search-clear');
const filterYear        = $('filter-year');
const filterMonth       = $('filter-month');
const filterCategory    = $('filter-category');
const filterSource      = $('filter-source');
const filterCompany     = $('filter-company');
const clearFiltersBtn   = $('clear-filters-btn');
const briefingsList     = $('briefings-list');
const resultsCount      = $('results-count');
const briefingCount     = $('briefing-count');
const contentLoading    = $('content-loading');
const briefingContainer = $('briefing-container');
const briefingBody      = $('briefing-body');
const briefingDateBadge = $('briefing-date-badge');
const briefingTagsEl    = $('briefing-tags');
const emptyState        = $('empty-state');
const btnResetEmpty     = $('btn-reset-empty');
const sidebar           = $('sidebar');
const sidebarToggle     = $('sidebar-toggle');
const sidebarOverlay    = $('sidebar-overlay');

// ── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${MONTHS[parseInt(m,10)-1].slice(0,3)} ${parseInt(d,10)}, ${y}`;
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

// ── Fetch manifest ───────────────────────────────────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch('briefings/manifest.json?_=' + Date.now());
    if (!res.ok) throw new Error('Failed to load manifest');
    const data = await res.json();
    state.allBriefings = (data.briefings || []).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (err) {
    console.error('Manifest load error:', err);
    state.allBriefings = [];
  }
}

// ── Populate sidebar dropdowns ───────────────────────────────────────────────
function populateFilters() {
  const years = collectYears();
  filterYear.innerHTML = '<option value="">All Years</option>' +
    years.reverse().map(y => `<option value="${y}">${y}</option>`).join('');

  const cats = collectFromManifest('categories');
  filterCategory.innerHTML = '<option value="">All Categories</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  const sources = collectFromManifest('sources');
  filterSource.innerHTML = '<option value="">All Sources</option>' +
    sources.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');

  const companies = collectFromManifest('companies');
  filterCompany.innerHTML = '<option value="">All Companies</option>' +
    companies.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  briefingCount.textContent =
    `${state.allBriefings.length} Briefing${state.allBriefings.length !== 1 ? 's' : ''}`;
}

// ── Highlight active sidebar selects ────────────────────────────────────────
function updateSidebarActiveStates() {
  filterYear.classList.toggle('filter-active',     !!state.filters.year);
  filterMonth.classList.toggle('filter-active',    !!state.filters.month);
  filterCategory.classList.toggle('filter-active', !!state.filters.category);
  filterSource.classList.toggle('filter-active',   !!state.filters.source);
  filterCompany.classList.toggle('filter-active',  !!state.filters.company);
}

// ── Highlight active tag buttons ─────────────────────────────────────────────
function updateTagActiveStates() {
  if (!briefingTagsEl) return;
  briefingTagsEl.querySelectorAll('.briefing-tag').forEach(tag => {
    const type  = tag.dataset.filterType;
    const value = tag.dataset.filterValue;
    let isActive = false;
    if (type === 'category') isActive = state.filters.category === value;
    if (type === 'source')   isActive = state.filters.source   === value;
    if (type === 'company')  isActive = state.filters.company  === value;
    tag.classList.toggle('tag-active', isActive);
    tag.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

// ── Apply a filter (from tag click or sidebar) ───────────────────────────────
function setFilter(type, value) {
  if (type === 'category') {
    state.filters.category = state.filters.category === value ? '' : value;
    filterCategory.value   = state.filters.category;
  } else if (type === 'source') {
    state.filters.source = state.filters.source === value ? '' : value;
    filterSource.value   = state.filters.source;
  } else if (type === 'company') {
    state.filters.company = state.filters.company === value ? '' : value;
    filterCompany.value   = state.filters.company;
  }
  applyFilters();
}

// ── Filter logic ─────────────────────────────────────────────────────────────
function applyFilters() {
  const { search, year, month, category, source, company } = state.filters;
  const q = search.toLowerCase().trim();

  state.filtered = state.allBriefings.filter(b => {
    if (year     && b.date.slice(0,4) !== year)               return false;
    if (month    && b.date.slice(5,7) !== month)              return false;
    if (category && !(b.categories || []).includes(category)) return false;
    if (source   && !(b.sources    || []).includes(source))   return false;
    if (company  && !(b.companies  || []).includes(company))  return false;
    if (q) {
      const blob = [
        b.title, b.date,
        ...(b.categories || []),
        ...(b.sources    || []),
        ...(b.companies  || []),
        b.summary || '',
      ].join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  updateSidebarActiveStates();
  updateTagActiveStates();
  renderList();
}

// ── Render sidebar list ──────────────────────────────────────────────────────
function renderList() {
  resultsCount.textContent = state.filtered.length;

  if (state.filtered.length === 0) {
    briefingsList.innerHTML = '<li class="list-empty">No briefings match your filters.</li>';
    showEmptyState();
    return;
  }

  briefingsList.innerHTML = state.filtered.map(b => {
    const active = b.id === state.activeId ? ' active' : '';
    const cats   = (b.categories || []).slice(0, 3);
    return `
      <li class="briefing-list-item${active}" data-id="${esc(b.id)}" role="button" tabindex="0"
          aria-label="View briefing for ${esc(formatDate(b.date))}">
        <div class="bli-date">${esc(formatDateShort(b.date))}</div>
        <div class="bli-title">${esc(b.title)}</div>
        ${cats.length ? `<div class="bli-cats">${cats.map(c =>
          `<span class="bli-cat-tag">${esc(c)}</span>`).join('')}</div>` : ''}
      </li>`.trim();
  }).join('');

  briefingsList.querySelectorAll('.briefing-list-item').forEach(el => {
    el.addEventListener('click', () => {
      loadBriefing(el.dataset.id);
      if (isMobile()) closeSidebar();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        loadBriefing(el.dataset.id);
        if (isMobile()) closeSidebar();
      }
    });
  });
}

// ── Fetch & render a briefing ────────────────────────────────────────────────
async function loadBriefing(id) {
  if (state.activeId === id) return;
  state.activeId = id;

  const meta = state.allBriefings.find(b => b.id === id);
  if (!meta) return;

  briefingsList.querySelectorAll('.briefing-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

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
  briefingDateBadge.textContent = formatDate(meta.date);

  const tags = [
    ...(meta.categories || []).map(c =>
      `<button class="briefing-tag cat" data-filter-type="category"
        data-filter-value="${esc(c)}" aria-pressed="false" title="Filter by category: ${esc(c)}">${esc(c)}</button>`),
    ...(meta.sources || []).map(s =>
      `<button class="briefing-tag source" data-filter-type="source"
        data-filter-value="${esc(s)}" aria-pressed="false" title="Filter by source: ${esc(s)}">${esc(s)}</button>`),
    ...(meta.companies || []).map(c =>
      `<button class="briefing-tag company" data-filter-type="company"
        data-filter-value="${esc(c)}" aria-pressed="false" title="Filter by company: ${esc(c)}">${esc(c)}</button>`),
  ];
  briefingTagsEl.innerHTML = tags.join('');

  briefingTagsEl.querySelectorAll('.briefing-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filterType, btn.dataset.filterValue);
    });
  });

  updateTagActiveStates();

  const stripped = html.replace(
    /<script[^>]*id="briefing-meta"[^>]*>[\s\S]*?<\/script>/i, ''
  );
  briefingBody.innerHTML = stripped;

  showBriefing();
  $('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Show / hide states ───────────────────────────────────────────────────────
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

// ── Mobile sidebar ───────────────────────────────────────────────────────────
function isMobile() { return window.innerWidth <= 700; }

function openSidebar() {
  sidebar.classList.add('open');
  sidebarToggle.classList.add('is-open');
  sidebarToggle.setAttribute('aria-expanded', 'true');
  sidebarOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarToggle.classList.remove('is-open');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  sidebarOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
});

window.addEventListener('resize', () => {
  if (!isMobile()) {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }
});

// ── Sidebar filter event listeners ──────────────────────────────────────────
searchInput.addEventListener('input', () => {
  state.filters.search = searchInput.value;
  searchClear.classList.toggle('visible', searchInput.value.length > 0);
  applyFilters();
});

searchClear.addEventListener('click', () => {
  searchInput.value    = '';
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
  searchInput.value    = '';
  filterYear.value     = '';
  filterMonth.value    = '';
  filterCategory.value = '';
  filterSource.value   = '';
  filterCompany.value  = '';
  searchClear.classList.remove('visible');
  applyFilters();
  if (state.allBriefings.length > 0) loadBriefing(state.allBriefings[0].id);
}

clearFiltersBtn.addEventListener('click', resetAllFilters);
btnResetEmpty.addEventListener('click',   resetAllFilters);

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadManifest();
  populateFilters();
  applyFilters();
  if (state.filtered.length > 0) {
    loadBriefing(state.filtered[0].id);
  } else {
    showEmptyState();
  }
}

init();