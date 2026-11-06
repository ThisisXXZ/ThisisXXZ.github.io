const section = document.querySelector('[data-comments]');

if (section) {
  const options = JSON.parse(section.dataset.options);
  const mount = section.querySelector('.comments-mount');
  const status = section.querySelector('.comments-status');
  const message = status.querySelector('span');
  const retry = section.querySelector('[data-comments-retry]');
  let loading;
  let instance;
  let phase = 'loading';
  let latestRequest = 0;
  const language = () => (document.documentElement.lang === 'zh-Hant' ? 'zh-TW' : 'zh-CN');
  const locale = () =>
    language() === 'zh-TW'
      ? {
          placeholder: '寫下你的想法……（郵箱和網址都是選填哦）',
          sofa: '還沒有留言。',
          mail: '郵箱',
          optional: '選填',
          latest: '最新',
          oldest: '最早',
          hottest: '熱門',
        }
      : {
          placeholder: '写下你的想法……（邮箱和网址都是选填哦）',
          sofa: '还没有留言。',
          mail: '邮箱',
          optional: '选填',
          latest: '最新',
          oldest: '最早',
          hottest: '热门',
        };

  const refreshButton = () => mount.querySelector('[data-waline] > .wl-operation > button');
  const renderStatus = () => {
    const traditional = language() === 'zh-TW';
    const failed = phase === 'error' || phase === 'timeout';
    section.dataset.commentsState = phase;
    section.setAttribute('aria-busy', String(phase === 'loading'));
    status.hidden = !failed && (phase !== 'loading' || Boolean(instance));
    message.textContent =
      phase === 'timeout'
        ? traditional
          ? '評論連線逾時，請稍後重試。'
          : '评论连接超时，请稍后重试。'
        : phase === 'error'
          ? traditional
            ? '評論暫時無法載入，請稍後重試。'
            : '评论暂时无法加载，请稍后重试。'
          : traditional
            ? '正在載入評論…'
            : '正在加载评论…';
    retry.textContent = traditional ? '重試' : '重试';
    retry.hidden = !failed;
    retry.disabled = failed && Boolean(instance) && !refreshButton();
  };
  window.addEventListener('blog:comments-request', ({ detail }) => {
    const url = new URL(detail.url);
    const server = new URL(options.serverURL);
    if (url.origin !== server.origin || url.searchParams.get('path') !== options.path) return;
    if (detail.id < latestRequest) return;
    latestRequest = detail.id;
    phase = detail.phase === 'success' || detail.phase === 'cancelled' ? 'ready' : detail.phase;
    renderStatus();
  });

  async function start() {
    if (instance || loading) return loading;
    phase = 'loading';
    renderStatus();
    loading = (async () => {
      let timer;
      try {
        const [{ init }, { default: katex }] = await Promise.race([
          Promise.all([import('/vendor/waline/3.16.2/waline-dc7a6f8ee1dc.js'), import('/vendor/katex/0.19.1/katex.mjs')]),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new DOMException('Comment module timed out', 'TimeoutError')),
              15_000
            );
          }),
        ]);
        instance = init({
          ...options,
          el: mount,
          lang: language(),
          locale: locale(),
          dark: false,
          pageview: false,
          comment: false,
          texRenderer: (blockMode, tex) =>
            katex.renderToString(tex, { displayMode: blockMode, throwOnError: false, trust: false }),
        });
        renderStatus();
      } catch (error) {
        phase = error.name === 'TimeoutError' ? 'timeout' : 'error';
        renderStatus();
      } finally {
        clearTimeout(timer);
        loading = undefined;
      }
    })();
    return loading;
  }

  retry.addEventListener('click', () => {
    if (instance) refreshButton()?.click();
    else start();
  });
  // The upstream sort controls are list items; retain their appearance while
  // exposing the same actions to keyboard and assistive technology.
  const decorate = () => {
    // Vue creates the native refresh button after the request rejects.
    if (phase === 'error' || phase === 'timeout') renderStatus();
    // The editor placeholder explains optional fields; keep their labels concise.
    for (const label of mount.querySelectorAll('.wl-header label')) {
      const text = label.textContent.replace(/[（(](?:选填|選填)[）)]$/, '');
      if (label.textContent !== text) label.textContent = text;
    }
    mount
      .querySelector('textarea')
      ?.setAttribute('aria-label', language() === 'zh-TW' ? '評論內容' : '评论内容');
    for (const item of mount.querySelectorAll('.wl-sort li')) {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-pressed', String(item.classList.contains('active')));
    }
  };
  new MutationObserver(decorate).observe(mount, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  mount.addEventListener('keydown', (event) => {
    const item = event.target.closest('.wl-sort li');
    if (item && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      item.click();
    }
  });
  window.addEventListener('blog:languagechange', () => {
    // Waline resets path on update unless it is explicitly supplied.
    instance?.update({ path: options.path, lang: language(), locale: locale() });
    renderStatus();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '240px' }
    );
    observer.observe(section);
  } else start();
}
