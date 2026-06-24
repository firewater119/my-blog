function escape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\sㄱ-힣]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseInline(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, (_, code) => `<code>${escape(code)}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      const external = href.startsWith('http');
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    });
}

export function parse(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 펜스 코드 블록
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = escape(codeLines.join('\n'));
      const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
      blocks.push(`<pre>${langLabel}<code>${code}</code></pre>`);
      i++;
      continue;
    }

    // 수평선
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push('<hr>');
      i++;
      continue;
    }

    // 제목 (id 자동 부여)
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const id = slugify(text);
      blocks.push(`<h${level} id="${id}">${parseInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 블록 인용
    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(`<blockquote><p>${quoteLines.map(parseInline).join('<br>')}</p></blockquote>`);
      continue;
    }

    // 순서 없는 목록
    if (/^[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${parseInline(lines[i].slice(2))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // 순서 있는 목록
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${parseInline(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // 표
    if (line.includes('|') && lines[i + 1] && /^\|?[\s\-|:]+\|?$/.test(lines[i + 1])) {
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
        i++;
      }
      const thead = `<thead><tr>${headerCells.map(c => `<th>${parseInline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${parseInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      blocks.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 단락
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push(`<p>${parseInline(paraLines.join(' '))}</p>`);
    }
  }

  return blocks.join('\n');
}

export function extractToc(markdown) {
  const headings = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      headings.push({
        level: m[1].length,
        text: m[2],
        id: slugify(m[2]),
      });
    }
  }
  return headings;
}
