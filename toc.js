// Native fragment links still work without this optional enhancement.
document.querySelectorAll('[data-article-toc]').forEach((toc) => {
  const toggle = toc.querySelector('.toc-toggle');
  const close = toc.querySelector('.toc-close');
  const panel = toc.querySelector('.toc-panel');
  const drawer = toc.querySelector('.toc-drawer');
  const nav = toc.querySelector('nav');
  const entries = [...nav.querySelectorAll('a')]
    .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter(({ heading }) => heading);
  const wide = window.matchMedia('(min-width: 1280px)');
  toggle.hidden = false;
  close.hidden = false;
  toc.classList.add('toc-ready');
  const revealCurrent = () => {
    const link = nav.querySelector('[aria-current="location"]');
    if (!link) return;
    const item = link.getBoundingClientRect();
    const bounds = nav.getBoundingClientRect();
    if (item.top < bounds.top) nav.scrollTop += item.top - bounds.top - 8;
    else if (item.bottom > bounds.bottom) nav.scrollTop += item.bottom - bounds.bottom + 8;
  };
  const placePanel = () => {
    if (drawer.open) drawer.close();
    toggle.setAttribute('aria-expanded', 'false');
    if (wide.matches) toc.insertBefore(panel, drawer);
    else drawer.append(panel);
  };
  placePanel();
  wide.addEventListener('change', placePanel);
  toggle.addEventListener('click', () => {
    if (wide.matches) return;
    drawer.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    (nav.querySelector('[aria-current="location"]') || close).focus({ preventScroll: true });
    revealCurrent();
  });
  close.addEventListener('click', () => drawer.close());
  drawer.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
  drawer.addEventListener('click', (event) => {
    if (event.target !== drawer) return;
    const rect = drawer.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      drawer.close();
  });
  entries.forEach(({ link, heading }) => {
    heading.tabIndex = -1;
    link.addEventListener('click', () => {
      if (drawer.open) drawer.close();
    });
  });

  let active;
  let pending = false;
  const update = () => {
    pending = false;
    let current = entries[0];
    const readingLine = Math.min(96, window.innerHeight * 0.15);
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > readingLine) break;
      current = entry;
    }
    if (!current || active === current) return;
    active?.link.removeAttribute('aria-current');
    active = current;
    active.link.setAttribute('aria-current', 'location');
    // Keep long outlines in view without pulling focus or moving the article.
    if (wide.matches && !nav.matches(':hover, :focus-within')) revealCurrent();
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  new ResizeObserver(schedule).observe(document.querySelector('.prose'));
  document.fonts.ready.then(schedule);
  update();
});
