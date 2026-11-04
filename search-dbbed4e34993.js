import { Converter } from '/vendor/opencc/cn2t-1.4.1.js';
import { createSearchEngine, queryTerms } from '/search-core-6eca752619d7.js';
import { convertChineseText } from './chinese-text.js';

const form = document.querySelector('[data-search-form]');
const input = form.elements.q;
const scope = form.elements.section;
const status = document.querySelector('[data-search-status]');
const list = document.querySelector('[data-search-results]');
const more = document.querySelector('[data-search-more]');
const converter = Converter({ from: 'cn', to: 'tw' });
let enginePromise,
  revision = 0,
  results = [],
  shown = 0,
  timer;

function engine() {
  if (!enginePromise)
    enginePromise = fetch(document.querySelector('[data-search-index]').dataset.searchIndex)
      .then((response) => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      })
      .then((data) => {
        if (data.schema !== 1 || !Array.isArray(data.entries)) throw new Error('Unsupported search index');
        return createSearchEngine(data.entries, { convert: (text) => convertChineseText(text, converter) });
      })
      .catch((error) => {
        enginePromise = null;
        throw error;
      });
  return enginePromise;
}

function highlighted(element, text) {
  const terms = queryTerms(input.value).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) {
    element.textContent = text;
    return;
  }
  const pattern = new RegExp(terms.join('|'), 'giu');
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    element.append(document.createTextNode(text.slice(position, match.index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    element.append(mark);
    position = match.index + match[0].length;
  }
  element.append(document.createTextNode(text.slice(position)));
}

function appendResults() {
  const fragment = document.createDocumentFragment();
  const next = Math.min(shown + 15, results.length);
  for (const result of results.slice(shown, next)) {
    const item = document.createElement('li');
    const meta = document.createElement('p');
    meta.className = 'search-result-meta';
    meta.textContent = result.label + (result.date ? ' / ' + result.date.replaceAll('-', '.') : '');
    const title = document.createElement('h2');
    const link = document.createElement('a');
    link.href = result.url;
    highlighted(link, result.title);
    title.append(link);
    const excerpt = document.createElement('p');
    excerpt.className = 'search-excerpt';
    highlighted(excerpt, result.excerpt);
    item.append(meta, title, excerpt);
    fragment.append(item);
  }
  list.append(fragment);
  shown = next;
  more.hidden = shown === results.length;
}

async function search({ updateURL = true } = {}) {
  const current = ++revision;
  const query = input.value.trim().slice(0, 200);
  const section = scope.value;
  if (updateURL) {
    const url = new URL(location.href);
    query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
    section ? url.searchParams.set('section', section) : url.searchParams.delete('section');
    history.replaceState(null, '', url);
  }
  list.replaceChildren();
  list.removeAttribute('aria-busy');
  more.hidden = true;
  results = [];
  shown = 0;
  if (!query) {
    status.textContent = '';
    return;
  }
  status.textContent = '正在查找…';
  list.setAttribute('aria-busy', 'true');
  try {
    const find = await engine();
    if (current !== revision) return;
    results = find(query, { section });
    status.textContent = results.length
      ? `找到 ${results.length} 条结果`
      : '没有找到相关内容，试试更短的关键词。';
    appendResults();
  } catch {
    if (current === revision) status.textContent = '搜索暂时不可用，请稍后重试。';
  } finally {
    if (current === revision) list.removeAttribute('aria-busy');
  }
}

function restore() {
  const params = new URLSearchParams(location.search);
  input.value = (params.get('q') || '').slice(0, 200);
  scope.value = params.get('section') || '';
  if (scope.selectedIndex < 0) scope.value = '';
  void search({ updateURL: false });
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(timer);
  void search();
});
input.addEventListener('input', (event) => {
  clearTimeout(timer);
  ++revision;
  if (!event.isComposing) timer = setTimeout(() => void search(), 180);
});
input.addEventListener('compositionend', () => {
  clearTimeout(timer);
  timer = setTimeout(() => void search(), 180);
});
scope.addEventListener('change', () => {
  clearTimeout(timer);
  void search();
});
more.addEventListener('click', () => {
  const firstNew = shown;
  appendResults();
  list.children[firstNew]?.querySelector('a')?.focus({ preventScroll: true });
});
addEventListener('popstate', restore);
restore();
