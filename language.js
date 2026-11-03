import { conversionExcluded, convertedAttributes, convertChineseText } from './chinese-text.js';

const controls = document.querySelector('.language-switch');
if (controls) {
  const storageKey = 'Lalande.chineseScript';
  const buttons = [...controls.querySelectorAll('button')];
  const status = document.querySelector('.language-status');
  const originals = new WeakMap();
  const originalLanguage = document.documentElement.lang;
  let mode = 'cn';
  let converter;
  let loading;

  function loadFonts() {
    const href = document.querySelector('meta[name="traditional-fonts"]')?.content;
    if (!href) return Promise.reject(new Error('Missing traditional fonts.'));
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      const timer = setTimeout(fail, 12000);
      function fail() {
        clearTimeout(timer);
        link.remove();
        reject(new Error('Traditional fonts could not be loaded.'));
      }
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      link.onerror = fail;
      document.head.append(link);
    });
  }

  function ready() {
    if (loading) return loading;
    loading = Promise.all([
      import('/vendor/opencc/cn2t-1.4.1.js').then(({ Converter }) => {
        converter = Converter({ from: 'cn', to: 'tw' });
      }),
      loadFonts(),
    ])
      .then(async () => {
        const text = [...new Set(convertChineseText(document.body.textContent, converter))].join('');
        await Promise.all(
          [400, 500].map((weight) => document.fonts.load(`${weight} 16px "LXGW WenKai Traditional"`, text))
        );
      })
      .catch((error) => {
        loading = undefined;
        throw error;
      });
    return loading;
  }

  function updateValue(node, key, current, write) {
    let values = originals.get(node);
    if (!values) {
      if (mode === 'cn') return;
      values = new Map();
      originals.set(node, values);
    }
    let saved = values.get(key);
    // Preserve a newly inserted value, including widgets which reuse a text node.
    if (!saved || current !== saved.rendered) {
      saved = { source: current, rendered: current };
      values.set(key, saved);
    }
    const next = mode === 'tw' ? convertChineseText(saved.source, converter) : saved.source;
    if (next !== current) write(next);
    saved.rendered = next;
  }

  function visit(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element || element.closest(conversionExcluded)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      updateValue(node, 'text', node.data, (value) => {
        node.data = value;
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const name of convertedAttributes) {
        if (node.hasAttribute(name))
          updateValue(node, name, node.getAttribute(name), (value) => node.setAttribute(name, value));
      }
    }
  }

  function convertTree(root) {
    visit(root);
    if (root.nodeType === Node.TEXT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.nodeType === Node.ELEMENT_NODE && node.matches(conversionExcluded)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) visit(walker.currentNode);
  }

  const observer = new MutationObserver((records) => {
    if (mode !== 'tw') return;
    observer.disconnect();
    const roots = new Set();
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach((node) => roots.add(node));
      else roots.add(record.target);
    }
    for (const root of roots) if (root.isConnected) convertTree(root);
    observe();
  });
  function observe() {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: convertedAttributes,
    });
    const title = document.querySelector('title');
    if (title) observer.observe(title, { subtree: true, childList: true, characterData: true });
  }

  async function setMode(next) {
    controls.setAttribute('aria-busy', 'true');
    buttons.forEach((button) => {
      button.disabled = true;
    });
    status.hidden = true;
    try {
      if (next === 'tw') await ready();
      observer.disconnect();
      mode = next;
      convertTree(document.body);
      convertTree(document.querySelector('title'));
      document.documentElement.lang = mode === 'tw' ? 'zh-Hant' : originalLanguage;
      buttons.forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.chineseScript === mode))
      );
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        /* Storage is optional. */
      }
      window.dispatchEvent(new CustomEvent('blog:languagechange', { detail: { mode } }));
    } catch {
      status.textContent = '转换暂时不可用，请重试。';
      status.hidden = false;
    } finally {
      observe();
      controls.removeAttribute('aria-busy');
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }
  controls.hidden = false;
  controls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-chinese-script]');
    if (button && button.dataset.chineseScript !== mode) setMode(button.dataset.chineseScript);
  });
  observe();
  try {
    if (localStorage.getItem(storageKey) === 'tw') setMode('tw');
  } catch {
    /* Original text stays readable when storage is unavailable. */
  }
}
