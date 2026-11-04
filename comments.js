const section = document.querySelector('[data-comments]');

if (section) {
  const options = JSON.parse(section.dataset.options);
  const mount = section.querySelector('.comments-mount');
  const status = section.querySelector('.comments-status');
  const message = status.querySelector('span');
  const retry = section.querySelector('[data-comments-retry]');
  let loading;
  let instance;
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

  async function start() {
    if (instance || loading) return loading;
    status.hidden = false;
    retry.hidden = true;
    section.setAttribute('aria-busy', 'true');
    loading = (async () => {
      try {
        const [{ init }, { default: katex }] = await Promise.all([
          import('/vendor/waline/3.16.2/waline.js'),
          import('/vendor/katex/0.19.1/katex.mjs'),
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
        status.hidden = true;
      } catch {
        message.textContent = '评论暂时无法加载。';
        retry.hidden = false;
      } finally {
        section.removeAttribute('aria-busy');
        loading = undefined;
      }
    })();
    return loading;
  }

  retry.addEventListener('click', start);
  // The upstream sort controls are list items; retain their appearance while
  // exposing the same actions to keyboard and assistive technology.
  const decorate = () => {
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
