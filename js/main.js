import { init as initTheme } from './theme.js';

initTheme();

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

let allPosts = [];
let activeTag = null;
let searchQuery = '';
let debounceTimer = null;

function renderList(posts) {
  const container = document.getElementById('post-list');
  if (posts.length === 0) {
    container.innerHTML = '<div class="state-empty">검색 결과가 없습니다.</div>';
    return;
  }
  container.innerHTML = posts.map(post => {
    const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="post-item">
        <span class="post-item-date">${formatDate(post.date)}</span>
        <span class="post-item-title">${post.title}</span>
        ${tags ? `<span class="post-item-tags">${tags}</span>` : ''}
      </a>
    `.trim();
  }).join('');
}

function filter() {
  let result = allPosts;
  if (activeTag) {
    result = result.filter(p => (p.tags || []).includes(activeTag));
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  renderList(result);
}

function initTagFilter(posts) {
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
  const container = document.getElementById('tag-filter');
  if (!container || allTags.length === 0) return;

  container.innerHTML = allTags.map(t =>
    `<button class="tag-btn" data-tag="${t}">${t}</button>`
  ).join('');

  // URL hash에서 초기 태그 읽기
  const hash = location.hash.slice(1);
  if (hash.startsWith('tag=')) {
    const t = decodeURIComponent(hash.slice(4));
    if (allTags.includes(t)) {
      activeTag = t;
      container.querySelector(`[data-tag="${t}"]`)?.classList.add('active');
    }
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const tag = btn.dataset.tag;

    if (activeTag === tag) {
      activeTag = null;
      history.replaceState(null, '', location.pathname);
      container.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    } else {
      activeTag = tag;
      history.replaceState(null, '', `#tag=${encodeURIComponent(tag)}`);
      container.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    filter();
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      filter();
    }, 200);
  });
}

async function load() {
  const container = document.getElementById('post-list');
  try {
    const res = await fetch('posts/index.json');
    if (!res.ok) throw new Error();
    allPosts = await res.json();
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    initTagFilter(allPosts);
    initSearch();
    filter();
  } catch {
    container.innerHTML = '<div class="state-error">포스트를 불러올 수 없습니다.</div>';
  }
}

load();
