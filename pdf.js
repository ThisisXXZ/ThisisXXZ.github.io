import { getDocument, GlobalWorkerOptions, TextLayer } from '/vendor/pdfjs/pdf.js';

GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.js';
const mounted = new WeakSet();

// Each embedded document owns its page, zoom and rendering lifecycle.
export async function mountPdf(figure) {
  if (mounted.has(figure)) return;
  mounted.add(figure);
  const viewportElement = figure.querySelector('.pdf-viewport');
  const stage = figure.querySelector('.pdf-stage');
  const status = figure.querySelector('.pdf-status');
  const controls = figure.querySelector('.pdf-controls');
  const count = figure.querySelector('[data-pdf-page]');
  const previous = figure.querySelector('[data-pdf-prev]');
  const next = figure.querySelector('[data-pdf-next]');
  const smaller = figure.querySelector('[data-pdf-out]');
  const larger = figure.querySelector('[data-pdf-in]');
  const fit = figure.querySelector('[data-pdf-fit]');
  let document;
  let pageNumber = 1;
  let zoom = 1;
  let generation = 0;
  let canvasTask;
  let textTask;
  let width = viewportElement.clientWidth;
  let resizeTimer;

  const updateControls = () => {
    previous.disabled = !document || pageNumber === 1;
    next.disabled = !document || pageNumber === document.numPages;
    smaller.disabled = !document || zoom <= 0.75;
    larger.disabled = !document || zoom >= 2.5;
    fit.disabled = !document;
    fit.setAttribute('aria-pressed', String(zoom === 1));
  };

  const unavailable = () => {
    figure.classList.add('pdf-unavailable');
    viewportElement.setAttribute('aria-busy', 'false');
    stage.replaceChildren();
    controls.hidden = true;
    figure.querySelector('.pdf-fallback').hidden = false;
    status.hidden = false;
    status.textContent = '无法加载预览，请打开原文阅读。';
  };

  async function render({ resetScroll = false } = {}) {
    const version = ++generation;
    canvasTask?.cancel();
    textTask?.cancel();
    viewportElement.setAttribute('aria-busy', 'true');
    try {
      const page = await document.getPage(pageNumber);
      if (version !== generation) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(0.1, (viewportElement.clientWidth - 24) / base.width) * zoom;
      const viewport = page.getViewport({ scale });
      // Bound canvas memory even on large screens and high-density phones.
      const density = Math.min(
        window.devicePixelRatio || 1,
        2,
        Math.sqrt(8_000_000 / (viewport.width * viewport.height))
      );
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * density);
      canvas.height = Math.ceil(viewport.height * density);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute('aria-hidden', 'true');
      const renderedPage = window.document.createElement('div');
      renderedPage.className = 'pdf-page';
      renderedPage.style.width = `${viewport.width}px`;
      renderedPage.style.height = `${viewport.height}px`;
      renderedPage.style.setProperty('--total-scale-factor', viewport.scale * page.userUnit);
      const text = window.document.createElement('div');
      text.className = 'pdf-text-layer';
      renderedPage.append(canvas, text);
      canvasTask = page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
        transform: density === 1 ? null : [density, 0, 0, density, 0, 0],
      });
      await canvasTask.promise;
      if (version !== generation) return;
      const content = await page.getTextContent();
      if (version !== generation) return;
      textTask = new TextLayer({ textContentSource: content, container: text, viewport });
      await textTask.render();
      if (version !== generation) return;
      stage.replaceChildren(renderedPage);
      count.textContent = `${pageNumber} / ${document.numPages}`;
      status.hidden = true;
      viewportElement.setAttribute('aria-busy', 'false');
      if (resetScroll) viewportElement.scrollTo({ top: 0, left: 0 });
    } catch (error) {
      if (
        version !== generation ||
        error.name === 'RenderingCancelledException' ||
        error.name === 'AbortException'
      )
        return;
      unavailable();
    }
  }

  status.textContent = '正在加载 PDF 预览…';
  viewportElement.setAttribute('aria-busy', 'true');
  const loading = getDocument({
    url: figure.querySelector('[data-pdf-source]').href,
    cMapUrl: '/vendor/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    wasmUrl: '/vendor/pdfjs/wasm/',
    iccUrl: '/vendor/pdfjs/iccs/',
    isEvalSupported: false,
  });
  // Password-protected files stay accessible through the original-document link.
  loading.onPassword = () => {
    unavailable();
    loading.destroy();
  };
  try {
    document = await loading.promise;
    controls.hidden = false;
    updateControls();
    await render();
  } catch {
    unavailable();
    return;
  }

  const go = (delta) => {
    pageNumber = Math.max(1, Math.min(document.numPages, pageNumber + delta));
    updateControls();
    render({ resetScroll: true });
  };
  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  const magnify = (value) => {
    zoom = Math.max(0.75, Math.min(2.5, value));
    updateControls();
    render();
  };
  smaller.addEventListener('click', () => magnify(zoom - 0.25));
  larger.addEventListener('click', () => magnify(zoom + 0.25));
  fit.addEventListener('click', () => magnify(1));
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      const nextWidth = viewportElement.clientWidth;
      if (!nextWidth || nextWidth === width) return;
      width = nextWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => render(), 150);
    });
    observer.observe(viewportElement);
  }
}
