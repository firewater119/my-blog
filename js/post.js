import { init as initTheme } from './theme.js';
import { parse, extractToc } from './markdown.js';

initTheme();

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

/* 읽기 진행바 */
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = docHeight > 0 ? `${(scrollTop / docHeight) * 100}%` : '0%';
      ticking = false;
    });
    ticking = true;
  });
}

/* 목차 생성 */
function buildToc(headings) {
  if (headings.length === 0) return '';

  const items = headings.map(h =>
    `<li class="toc-h${h.level}"><a href="#${h.id}">${h.text}</a></li>`
  ).join('');

  return `
    <nav class="toc" id="toc">
      <button class="toc-toggle" id="toc-toggle" aria-expanded="false">
        목차
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="toc-content" id="toc-content">
        <div class="toc-title">목차</div>
        <ul class="toc-list">${items}</ul>
      </div>
    </nav>
  `.trim();
}

/* TOC 스크롤 spy */
function initScrollSpy(headings) {
  if (headings.length === 0) return;
  const links = document.querySelectorAll('.toc-list a');
  if (links.length === 0) return;

  const ids = headings.map(h => h.id);

  function onScroll() {
    const scrollY = window.scrollY + 80;
    let current = ids[0];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) current = id;
    }
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* TOC 모바일 접기/펼치기 */
function initTocToggle() {
  const btn = document.getElementById('toc-toggle');
  const toc = document.getElementById('toc');
  if (!btn || !toc) return;
  btn.addEventListener('click', () => {
    const open = toc.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

async function load() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const titleEl = document.getElementById('post-title');
  const metaEl = document.getElementById('post-meta');
  const bodyEl = document.getElementById('post-body');
  const tocWrap = document.getElementById('toc-wrap');

  if (!slug) {
    titleEl.textContent = '포스트를 찾을 수 없습니다';
    bodyEl.innerHTML = '<p>URL에 slug 파라미터가 없습니다. <a href="index.html">← 목록으로</a></p>';
    return;
  }

  try {
    const [manifestRes, postRes] = await Promise.all([
      fetch('posts/index.json'),
      fetch(`posts/${slug}.md`),
    ]);

    if (!postRes.ok) throw new Error('not found');

    const manifest = manifestRes.ok ? await manifestRes.json() : [];
    const markdown = await postRes.text();
    const meta = manifest.find(p => p.slug === slug) || {};

    const title = meta.title || slug;
    document.title = `${title} — My Blog`;
    titleEl.textContent = title;

    const tags = (meta.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ');
    metaEl.innerHTML = [
      meta.date ? `<time datetime="${meta.date}">${formatDate(meta.date)}</time>` : '',
      tags,
    ].filter(Boolean).join('<span>·</span>');

    // TOC
    const headings = extractToc(markdown);
    if (tocWrap) tocWrap.innerHTML = buildToc(headings);
    initTocToggle();

    // 본문
    bodyEl.innerHTML = parse(markdown);

    initScrollSpy(headings);
    initProgressBar();

  } catch {
    document.title = '포스트를 찾을 수 없습니다';
    titleEl.textContent = '포스트를 찾을 수 없습니다';
    metaEl.innerHTML = '';
    bodyEl.innerHTML = `<p>포스트를 불러올 수 없습니다. <a href="index.html">← 목록으로</a></p>`;
  }
}

load();
