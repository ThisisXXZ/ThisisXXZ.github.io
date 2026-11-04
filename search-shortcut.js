document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey) return;
  if (event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
  if (document.querySelector('dialog[open]')) return;
  if (
    (event.key === '/' && !event.ctrlKey && !event.metaKey) ||
    (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey))
  ) {
    event.preventDefault();
    const field = document.querySelector('[data-search-input]');
    if (field) field.focus();
    else location.assign('/search/');
  }
});
