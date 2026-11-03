// Progressive enhancements; text, links and disclosures also work without JS.
// Stellar supplies click behaviour; this layer adds keyboard and screen-reader support.
document.querySelectorAll('.tag-plugin.tabs').forEach((group) => {
  const list = group.querySelector(':scope > .nav-tabs');
  const tabs = [...list.querySelectorAll(':scope > .tab > a')];
  const panels = [...group.querySelectorAll(':scope > .tab-content > .tab-pane')];
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', '内容版本');
  const sync = () =>
    tabs.forEach((tab, index) => {
      const active = tab.parentElement.classList.contains('active');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].tabIndex = 0;
    });
  tabs.forEach((tab, i) =>
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = i;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus();
    })
  );
  group.addEventListener('tabs:click', sync);
  if (!tabs.some((tab) => tab.parentElement.classList.contains('active'))) tabs[0]?.click();
  sync();
  group.classList.add('tabs-ready');
});

document.querySelectorAll('[data-copy-code]').forEach((button) => {
  button.addEventListener('click', async () => {
    const code = button.closest('.code-block').querySelector('code').textContent;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = '已复制';
    } catch {
      button.textContent = '请选中文字复制';
    }
    setTimeout(() => {
      button.textContent = '复制';
    }, 2000);
  });
});
