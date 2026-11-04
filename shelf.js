// Native disclosures remain readable without JavaScript; pointer users get a floating note.
const shelf = document.querySelector('.shelf');
if (shelf) {
  shelf.dataset.hoverReady = '';
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let active;
  let openTimer;
  let closeTimer;
  let restoringFocus = false;

  shelf.addEventListener('click', (event) => {
    const spoiler = event.target.closest('.comment-spoiler');
    if (!spoiler) return;
    const revealed = spoiler.getAttribute('aria-expanded') !== 'true';
    spoiler.setAttribute('aria-expanded', String(revealed));
    spoiler.querySelector('span').setAttribute('aria-hidden', String(!revealed));
    if (revealed) spoiler.removeAttribute('aria-label');
    else spoiler.setAttribute('aria-label', '显示剧透');
  });

  const position = () => {
    if (!active) return;
    const { item, card } = active;
    const anchor = item.querySelector('.cover-stage').getBoundingClientRect();
    const padding = 16;
    card.style.maxHeight = `${Math.max(100, innerHeight - padding * 2)}px`;
    const { width, height } = card.getBoundingClientRect();
    let x = anchor.right + 14;
    let y = anchor.top + 8;
    if (x + width > innerWidth - padding) {
      x = anchor.left - width - 14;
      if (x < padding) {
        x = anchor.left;
        y = anchor.bottom + 12;
        if (y + height > innerHeight - padding) y = anchor.top - height - 12;
      }
    }
    card.style.left = `${Math.max(padding, Math.min(x, innerWidth - width - padding))}px`;
    card.style.top = `${Math.max(padding, Math.min(y, innerHeight - height - padding))}px`;
  };
  const close = (restoreFocus = false) => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    if (!active) return;
    const previous = active;
    active = undefined;
    previous.pinned = false;
    previous.details.open = false;
    previous.summary.setAttribute('aria-expanded', 'false');
    if (restoreFocus && previous.card.contains(document.activeElement)) {
      restoringFocus = true;
      previous.summary.focus({ preventScroll: true });
      restoringFocus = false;
    }
  };
  const open = (entry, pinned = false) => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    if (active !== entry) close();
    active = entry;
    entry.pinned = pinned || entry.pinned;
    entry.details.open = true;
    entry.summary.setAttribute('aria-expanded', 'true');
    position();
  };
  const scheduleClose = (entry) => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (active !== entry || entry.pinned) return;
      if (!entry.item.matches(':hover') && !entry.item.contains(document.activeElement)) close();
    }, 180);
  };
  shelf.querySelectorAll('[data-comment]').forEach((details) => {
    const entry = {
      details,
      item: details.closest('.shelf-item'),
      summary: details.querySelector('summary'),
      card: details.querySelector('.comment-card'),
      pinned: false,
    };
    entry.summary.setAttribute('aria-expanded', 'false');
    entry.item.addEventListener('pointerenter', (event) => {
      if (!hover.matches || event.pointerType === 'touch') return;
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      if (active === entry) return;
      openTimer = setTimeout(() => {
        entry.pinned = false;
        open(entry);
      }, 240);
    });
    entry.item.addEventListener('pointerleave', () => scheduleClose(entry));
    entry.card.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    entry.card.addEventListener('pointerleave', () => scheduleClose(entry));
    entry.item.addEventListener('focusin', (event) => {
      if (!restoringFocus && event.target.matches(':focus-visible') && !entry.card.contains(event.target))
        open(entry);
    });
    entry.item.addEventListener('focusout', (event) => {
      if (!entry.item.contains(event.relatedTarget)) {
        entry.pinned = false;
        scheduleClose(entry);
      }
    });
    entry.summary.addEventListener('click', (event) => {
      event.preventDefault();
      if (active === entry && entry.pinned) {
        entry.pinned = false;
        close();
      } else open(entry, true);
    });
    entry.card.querySelector('.comment-close').addEventListener('click', () => {
      entry.pinned = false;
      close(true);
    });
  });
  document.addEventListener('pointerdown', (event) => {
    if (active && !active.item.contains(event.target)) {
      active.pinned = false;
      close();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (active) active.pinned = false;
      close(true);
    }
  });
  let scheduled = false;
  const reposition = () => {
    if (!active || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      position();
    });
  };
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, { passive: true, capture: true });
}
