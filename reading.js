// Progressive enhancements; text, links and disclosures also work without JS.
document.querySelectorAll('[data-tabs]').forEach((group) => {
  const list = group.querySelector(':scope > .tab-list');
  const tabs = [...list.querySelectorAll('[data-tab]')];
  const panels = [...group.querySelectorAll(':scope > [data-panel]')];
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', '内容版本');
  const activate = (index) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].tabIndex = 0;
      panels[i].hidden = i !== index;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(next);
      tabs[next].focus();
    });
  });
  activate(Number(group.dataset.active) || 0);
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
