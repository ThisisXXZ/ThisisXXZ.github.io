// Galleries remain readable and scrollable without JavaScript.
document.querySelectorAll('[data-gallery="scroll"]').forEach((gallery) => {
  const track = gallery.querySelector('.gallery-track');
  const items = [...track.children];
  const controls = gallery.querySelector('.gallery-controls');
  const prev = controls.querySelector('[data-gallery-prev]');
  const next = controls.querySelector('[data-gallery-next]');
  let current = 0;
  const update = () => {
    const left = track.getBoundingClientRect().left;
    current = items.reduce(
      (best, item, i) =>
        Math.abs(item.getBoundingClientRect().left - left) <
        Math.abs(items[best].getBoundingClientRect().left - left)
          ? i
          : best,
      0
    );
    controls.querySelector('[data-gallery-count]').textContent = `${current + 1} / ${items.length}`;
    prev.disabled = current === 0;
    next.disabled = current === items.length - 1;
  };
  const move = (index) => {
    const item = items[Math.max(0, Math.min(items.length - 1, index))];
    track.scrollTo({
      left: track.scrollLeft + item.getBoundingClientRect().left - track.getBoundingClientRect().left,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  prev.addEventListener('click', () => move(current - 1));
  next.addEventListener('click', () => move(current + 1));
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', (event) => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    move(
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : current + (event.key === 'ArrowLeft' ? -1 : 1)
    );
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
  controls.hidden = items.length < 2;
  update();
});

const imageLinks = document.querySelectorAll('a[data-image]');
if (imageLinks.length && typeof HTMLDialogElement !== 'undefined') {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', '图片预览');
  dialog.innerHTML =
    '<form method="dialog"><button aria-label="关闭图片预览">关闭 ×</button></form><img alt=""><p class="viewer-caption"></p><div class="viewer-controls" hidden><button type="button" data-viewer-prev aria-label="上一张图片">←</button><span role="status"></span><button type="button" data-viewer-next aria-label="下一张图片">→</button></div><a target="_blank" rel="noopener">打开原图 ↗</a>';
  document.body.append(dialog);
  let opener;
  let group = [];
  let index = 0;
  const controls = dialog.querySelector('.viewer-controls');
  const prev = controls.querySelector('[data-viewer-prev]');
  const next = controls.querySelector('[data-viewer-next]');
  const show = (position) => {
    index = Math.max(0, Math.min(group.length - 1, position));
    const link = group[index];
    const img = link.querySelector('img');
    dialog.querySelector('img').src = link.href;
    dialog.querySelector('img').alt = img.alt;
    dialog.querySelector('.viewer-caption').textContent =
      link.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
    dialog.querySelector('a').href = link.href;
    controls.hidden = group.length < 2;
    controls.querySelector('[role="status"]').textContent = `${index + 1} / ${group.length}`;
    prev.disabled = index === 0;
    next.disabled = index === group.length - 1;
  };
  imageLinks.forEach((link) =>
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      group = [...(link.closest('[data-gallery]')?.querySelectorAll('a[data-image]') || [link])];
      show(group.indexOf(link));
      dialog.showModal();
    })
  );
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
}
