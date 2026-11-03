// A small entry point: load the renderer only when a widget approaches the viewport.
// Also works inside a disclosure or a tab that starts hidden.
const load = async (figure) => {
  try {
    const { mountPdf } = await import('/pdf.js');
    await mountPdf(figure);
  } catch {
    figure.classList.add('pdf-unavailable');
    figure.querySelector('.pdf-viewport').setAttribute('aria-busy', 'false');
    figure.querySelector('.pdf-controls').hidden = true;
    figure.querySelector('.pdf-status').textContent = '无法加载预览，请打开原文阅读。';
    figure.querySelector('.pdf-fallback').hidden = false;
  }
};
const figures = document.querySelectorAll('[data-pdf]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target);
      }
    },
    { rootMargin: '300px' }
  );
  figures.forEach((figure) => observer.observe(figure));
} else figures.forEach(load);
