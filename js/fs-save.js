// File System Access API 기반 직접 저장 헬퍼 (Chromium 계열 전용)
// 폴더 핸들을 IndexedDB에 저장해 세션 간 유지한다.

const DB_NAME = 'my-blog-fs';
const STORE = 'handles';
const KEY = 'root';

export const isSupported = 'showDirectoryPicker' in window;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function ensurePermission(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

// 저장된 루트 핸들을 가져오거나(권한 확인 포함) 없으면 null
export async function getSavedRoot() {
  if (!isSupported) return null;
  try {
    const handle = await idbGet(KEY);
    if (handle && (await ensurePermission(handle))) return handle;
  } catch {
    // 무시 — 새로 선택하게 함
  }
  return null;
}

// 사용자에게 블로그 루트 폴더를 선택받아 저장
export async function pickRoot() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  if (!(await ensurePermission(handle))) {
    throw new Error('폴더 쓰기 권한이 거부되었습니다.');
  }
  await idbSet(KEY, handle);
  return handle;
}

async function writeFile(dirHandle, name, contents) {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function readFileText(dirHandle, name) {
  try {
    const fileHandle = await dirHandle.getFileHandle(name);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null; // 파일 없음
  }
}

// 포스트 저장: posts/<slug>.md 작성 + posts/index.json 갱신
export async function savePost(rootHandle, { slug, markdown, entry }) {
  const postsDir = await rootHandle.getDirectoryHandle('posts', { create: true });

  // 1) 마크다운 파일 작성
  await writeFile(postsDir, `${slug}.md`, markdown);

  // 2) index.json 읽어서 갱신 (같은 slug면 교체, 아니면 맨 앞에 추가)
  const raw = await readFileText(postsDir, 'index.json');
  let posts = [];
  if (raw) {
    try { posts = JSON.parse(raw); } catch { posts = []; }
  }
  if (!Array.isArray(posts)) posts = [];

  const idx = posts.findIndex(p => p.slug === slug);
  if (idx >= 0) {
    posts[idx] = entry;
  } else {
    posts.unshift(entry);
  }

  await writeFile(postsDir, 'index.json', JSON.stringify(posts, null, 2) + '\n');

  return { replaced: idx >= 0, total: posts.length };
}
