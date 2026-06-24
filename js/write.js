import { init as initTheme } from './theme.js';
import { parse } from './markdown.js';
import { isSupported, getSavedRoot, pickRoot, savePost } from './fs-save.js';

initTheme();

const $ = id => document.getElementById(id);

const titleEl = $('f-title');
const dateEl = $('f-date');
const tagsEl = $('f-tags');
const slugEl = $('f-slug');
const excerptEl = $('f-excerpt');
const bodyEl = $('f-body');
const previewEl = $('preview');
const jsonEl = $('json-out');

let slugEditedManually = false;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\sㄱ-힣-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseTags(raw) {
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

function update() {
  // 미리보기
  previewEl.innerHTML = bodyEl.value.trim()
    ? parse(bodyEl.value)
    : '<p style="color:var(--color-text-muted)">본문을 입력하면 여기에 미리보기가 표시됩니다.</p>';

  // index.json 항목
  const entry = {
    slug: slugEl.value.trim(),
    title: titleEl.value.trim(),
    date: dateEl.value.trim(),
    tags: parseTags(tagsEl.value),
    excerpt: excerptEl.value.trim(),
  };
  jsonEl.textContent = JSON.stringify(entry, null, 2);
}

// 제목 → slug 자동 생성 (사용자가 직접 수정하기 전까지)
titleEl.addEventListener('input', () => {
  if (!slugEditedManually) {
    slugEl.value = slugify(titleEl.value);
  }
  update();
});

slugEl.addEventListener('input', () => {
  slugEditedManually = slugEl.value.trim() !== '';
  update();
});

[dateEl, tagsEl, excerptEl, bodyEl].forEach(el =>
  el.addEventListener('input', update)
);

// 오늘 날짜 기본값
function todayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
dateEl.value = todayStr();

// .md 다운로드
$('btn-download').addEventListener('click', () => {
  const slug = slugEl.value.trim() || 'untitled';
  const content = bodyEl.value;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ─── 폴더에 직접 저장 (File System Access API) ───
const directSaveBtn = $('btn-save-direct');
const statusEl = $('save-status');

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#e05555' : 'var(--color-text-muted)';
}

function validate() {
  const slug = slugEl.value.trim();
  const title = titleEl.value.trim();
  if (!slug) return '슬러그를 입력하세요.';
  if (!title) return '제목을 입력하세요.';
  if (!/^[a-z0-9가-힣-]+$/i.test(slug)) return '슬러그에 사용할 수 없는 문자가 있습니다.';
  if (!bodyEl.value.trim()) return '본문을 입력하세요.';
  return null;
}

if (directSaveBtn) {
  if (!isSupported) {
    // 미지원 브라우저: 버튼 숨기고 안내
    directSaveBtn.style.display = 'none';
    setStatus('이 브라우저는 직접 저장을 지원하지 않습니다. 아래 다운로드를 사용하세요.');
  } else {
    directSaveBtn.addEventListener('click', async () => {
      const err = validate();
      if (err) { setStatus(err, true); return; }

      try {
        directSaveBtn.disabled = true;
        setStatus('저장 중…');

        let root = await getSavedRoot();
        if (!root) {
          setStatus('블로그 루트 폴더(my-blog)를 선택하세요…');
          root = await pickRoot();
        }

        const slug = slugEl.value.trim();
        const entry = {
          slug,
          title: titleEl.value.trim(),
          date: dateEl.value.trim(),
          tags: parseTags(tagsEl.value),
          excerpt: excerptEl.value.trim(),
        };

        const result = await savePost(root, { slug, markdown: bodyEl.value, entry });
        const action = result.replaced ? '수정' : '저장';
        setStatus(`✓ ${slug}.md ${action} 완료 · index.json 갱신됨 (총 ${result.total}개).`);
      } catch (e) {
        if (e.name === 'AbortError') {
          setStatus('폴더 선택이 취소되었습니다.');
        } else {
          setStatus(`저장 실패: ${e.message}`, true);
        }
      } finally {
        directSaveBtn.disabled = false;
      }
    });
  }
}

// JSON 복사
$('btn-copy').addEventListener('click', async () => {
  const btn = $('btn-copy');
  try {
    await navigator.clipboard.writeText(jsonEl.textContent);
    const orig = btn.textContent;
    btn.textContent = '복사됨!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  } catch {
    // 클립보드 권한 없을 때: 텍스트 선택
    const range = document.createRange();
    range.selectNodeContents(jsonEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
});

update();
