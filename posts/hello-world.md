# 안녕하세요, 블로그를 시작합니다

드디어 블로그를 만들었습니다. 프레임워크 없이 순수 HTML, CSS, JavaScript만으로 마크다운 파일을 읽어 렌더링하는 방식입니다.

## 왜 이렇게 만들었나요?

복잡한 빌드 도구 없이 **글 쓰는 데만 집중**하고 싶었습니다. 새 포스트를 추가할 때 할 일은 딱 두 가지입니다.

1. `posts/` 폴더에 `.md` 파일 추가
2. `posts/index.json`에 메타데이터 한 줄 추가

그게 전부입니다. 배포도 GitHub Pages나 Netlify에 폴더째 올리면 끝납니다.

## 지원하는 기능

- 다크 모드 (시스템 설정 연동 + 수동 토글)
- 모바일 반응형 레이아웃
- 마크다운 파싱 (제목, 목록, 코드 블록, 표, 인용문 등)
- 외부 링크 새 탭 열기

## 코드 예시

```javascript
async function loadPost(slug) {
  const res = await fetch(`posts/${slug}.md`);
  const markdown = await res.text();
  return parse(markdown);
}
```

## 인용문

> 단순함은 궁극의 정교함이다.
> — 레오나르도 다 빈치

---

앞으로 개발, 독서, 일상에 관한 글을 꾸준히 써볼 생각입니다. 잘 부탁드립니다!
