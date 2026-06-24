import { supabase } from './supabase-client.js';

const PAGE_SIZE = 5;

const listEl = document.getElementById('ann-list');
const pagerEl = document.getElementById('ann-pager');

let currentPage = 1;
let totalCount = 0;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function renderList(rows) {
  if (!rows || rows.length === 0) {
    listEl.innerHTML = '<div class="state-empty">등록된 공지사항이 없습니다.</div>';
    return;
  }
  listEl.innerHTML = rows.map(r => `
    <div class="ann-item">
      <div class="ann-item-main">
        <span class="ann-item-title">${escapeHtml(r.title)}</span>
        <p class="ann-item-content">${escapeHtml(r.content)}</p>
      </div>
      <time class="ann-item-date">${formatDate(r.created_at)}</time>
    </div>
  `.trim()).join('');
}

function renderPager() {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) {
    pagerEl.innerHTML = '';
    return;
  }

  const parts = [];
  parts.push(`<button class="ann-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="이전 페이지">‹</button>`);
  for (let p = 1; p <= totalPages; p++) {
    parts.push(`<button class="ann-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`);
  }
  parts.push(`<button class="ann-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="다음 페이지">›</button>`);
  pagerEl.innerHTML = parts.join('');
}

async function loadPage(page) {
  currentPage = page;
  listEl.innerHTML = '<div class="state-loading"><div class="spinner"></div>불러오는 중…</div>';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from('announcements')
    .select('id, title, content, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    listEl.innerHTML = '<div class="state-error">공지사항을 불러오지 못했습니다.</div>';
    pagerEl.innerHTML = '';
    return;
  }

  totalCount = count ?? 0;
  renderList(data);
  renderPager();
}

pagerEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.ann-page-btn');
  if (!btn || btn.disabled) return;
  const page = Number(btn.dataset.page);
  if (page && page !== currentPage) {
    loadPage(page);
    document.getElementById('announcements').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

loadPage(1);
