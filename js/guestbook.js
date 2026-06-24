import { init as initTheme } from './theme.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

initTheme();

// Supabase 설정 (publishable 키는 공개되어도 안전 — RLS로 보호됨)
const SUPABASE_URL = 'https://drjdncphbjqlpeuazynd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7X1SbYQdMkRvzVBrg2Mshg__sv6NATB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const listEl = $('gb-list');
const form = $('gb-form');
const nameEl = $('gb-name');
const msgEl = $('gb-message');
const submitBtn = $('gb-submit');
const statusEl = $('gb-status');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#e05555' : 'var(--color-text-muted)';
}

function renderEntries(rows) {
  if (!rows || rows.length === 0) {
    listEl.innerHTML = '<div class="state-empty">아직 남겨진 글이 없습니다. 첫 글을 남겨보세요!</div>';
    return;
  }
  listEl.innerHTML = rows.map(r => `
    <div class="gb-entry">
      <div class="gb-entry-head">
        <span class="gb-entry-name">${escapeHtml(r.name)}</span>
        <time class="gb-entry-date">${formatDate(r.created_at)}</time>
      </div>
      <p class="gb-entry-message">${escapeHtml(r.message)}</p>
    </div>
  `.trim()).join('');
}

async function load() {
  listEl.innerHTML = '<div class="state-loading"><div class="spinner"></div>불러오는 중…</div>';
  const { data, error } = await supabase
    .from('guestbook')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    listEl.innerHTML = '<div class="state-error">글을 불러오지 못했습니다.</div>';
    return;
  }
  renderEntries(data);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameEl.value.trim();
  const message = msgEl.value.trim();

  if (!name) { setStatus('이름을 입력하세요.', true); return; }
  if (!message) { setStatus('내용을 입력하세요.', true); return; }
  if (name.length > 40) { setStatus('이름은 40자 이하로 입력하세요.', true); return; }
  if (message.length > 500) { setStatus('내용은 500자 이하로 입력하세요.', true); return; }

  submitBtn.disabled = true;
  setStatus('남기는 중…');

  const { error } = await supabase
    .from('guestbook')
    .insert({ name, message });

  submitBtn.disabled = false;

  if (error) {
    setStatus(`저장 실패: ${error.message}`, true);
    return;
  }

  msgEl.value = '';
  setStatus('남겼습니다. 고마워요!');
  await load();
});

load();
