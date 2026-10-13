(() => {
  const libraryUrl = document.currentScript.dataset.opencc;
  const storageKey = 'Stellar.chineseScript';
  const controls = document.querySelector('.language-switch');
  if (!controls) return;

  const excluded = [
    'script', 'style', 'noscript', 'pre', 'code', 'kbd', 'samp', 'textarea',
    'svg', 'math', 'iframe', '[contenteditable]:not([contenteditable="false"])',
    '[translate="no"]', '.notranslate', '.ignore-opencc',
    '[lang|="ja"]', '[lang|="ko"]', '.katex', '.mermaid',
    '.MathJax', '.MathJax_Display', '.MathJax_Preview', '.MathJax_SVG',
    'mjx-container', '#giscus', '.giscus'
  ].join(',');
  const attributes = ['title', 'alt', 'placeholder', 'aria-label'];
  const originals = new WeakMap();
  const originalLanguage = document.documentElement.lang;
  let mode = 'cn';
  let loading;
  let toTraditional;
  let toSimplified;

  function ready() {
    if (toTraditional) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => fail(), 12000);
      function fail() {
        clearTimeout(timeout);
        script.remove();
        loading = null;
        reject(new Error('Chinese conversion could not be loaded.'));
      }
      script.src = libraryUrl;
      script.onload = () => {
        clearTimeout(timeout);
        try {
          toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });
          toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
          resolve();
        } catch (error) {
          fail();
        }
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return loading;
  }

  function convertText(text, converter = toTraditional) {
    // Keep TeX source and Japanese phrases intact, including before MathJax loads.
    return text.split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$\\])+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g)
      .map((part, index) => index % 2 ? part : part.replace(
        /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u30fc\u3005]+/gu,
        phrase => /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(phrase)
          ? phrase : converter(phrase)
      )).join('');
  }

  function updateValue(node, key, current, write) {
    let values = originals.get(node);
    if (!values) {
      if (mode === 'cn') return;
      values = new Map();
      originals.set(node, values);
    }
    let saved = values.get(key);
    // Dynamic content can replace a node's text without replacing the node itself.
    if (!saved || current !== saved.rendered) {
      saved = { source: current, rendered: current };
      values.set(key, saved);
    }
    const next = mode === 'tw' ? convertText(saved.source) : saved.source;
    if (current !== next) write(next);
    saved.rendered = next;
  }

  function visit(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element || element.closest(excluded)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      updateValue(node, 'text', node.data, value => { node.data = value; });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      attributes.forEach(name => {
        if (!node.hasAttribute(name)) return;
        updateValue(node, name, node.getAttribute(name), value => node.setAttribute(name, value));
      });
    }
  }

  function convertTree(root) {
    visit(root);
    if (root.nodeType === Node.TEXT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(excluded)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) visit(walker.currentNode);
  }

  function syncComments() {
    const lang = mode === 'tw' ? 'zh-TW' : 'zh-CN';
    const host = document.getElementById('giscus');
    if (host) {
      host.setAttribute('data-lang', lang);
      host.querySelector('script')?.setAttribute('data-lang', lang);
    }
    document.querySelector('iframe.giscus-frame')?.contentWindow?.postMessage(
      { giscus: { setConfig: { lang } } }, 'https://giscus.app'
    );
  }

  const observer = new MutationObserver(records => {
    if (mode !== 'tw') return;
    observer.disconnect();
    const roots = new Set();
    records.forEach(record => {
      if (record.type === 'childList') {
        record.addedNodes.forEach(node => roots.add(node));
      } else {
        roots.add(record.target);
      }
    });
    roots.forEach(node => { if (node.isConnected) convertTree(node); });
    observe();
  });

  function observe() {
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: attributes
    });
    const title = document.querySelector('title');
    if (title) observer.observe(title, { subtree: true, childList: true, characterData: true });
  }

  async function setMode(next) {
    controls.setAttribute('aria-busy', 'true');
    const buttons = controls.querySelectorAll('button');
    buttons.forEach(button => { button.disabled = true; });
    try {
      if (next === 'tw') await ready();
      observer.disconnect();
      mode = next;
      convertTree(document.body);
      const title = document.querySelector('title');
      if (title) convertTree(title);
      document.documentElement.lang = mode === 'tw' ? 'zh-Hant' : originalLanguage;
      buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.chineseScript === mode));
      });
      try { localStorage.setItem(storageKey, mode); } catch (error) { /* Optional storage. */ }
      syncComments();
      window.dispatchEvent(new CustomEvent('stellar:languagechange', { detail: { mode } }));
    } catch (error) {
      window.console.warn(error.message);
      if (typeof hud !== 'undefined') hud.toast('\u7b80\u7e41\u8f6c\u6362\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    } finally {
      observe();
      controls.removeAttribute('aria-busy');
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  window.StellarLanguage = {
    ready,
    normalizeSearch: text => toSimplified ? convertText(text, toSimplified) : text
  };
  controls.hidden = false;
  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-chinese-script]');
    if (button && button.dataset.chineseScript !== mode) setMode(button.dataset.chineseScript);
  });
  document.addEventListener('load', event => {
    if (event.target.matches?.('iframe.giscus-frame')) syncComments();
  }, true);
  observe();
  try {
    if (localStorage.getItem(storageKey) === 'tw') setMode('tw');
  } catch (error) { /* The default remains readable when storage is blocked. */ }
})();
