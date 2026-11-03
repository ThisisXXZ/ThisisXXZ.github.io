// Shared by the browser and font builder so converted text keeps the same glyph coverage.
export const conversionExcluded = [
  'script',
  'style',
  'noscript',
  'pre',
  'code',
  'kbd',
  'samp',
  'textarea',
  'svg',
  'math',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[translate="no"]',
  '.notranslate',
  '[lang|="ja"]',
  '[lang|="ko"]',
  '.katex',
  '.mermaid',
  '.pdf-text-layer',
].join(',');

export const convertedAttributes = ['title', 'alt', 'placeholder', 'aria-label'];

export function convertChineseText(text, converter) {
  return text
    .split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$\\])+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g)
    .map((part, index) =>
      index % 2
        ? part
        : part.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u30fc\u3005]+/gu, (phrase) =>
            /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(phrase) ? phrase : converter(phrase)
          )
    )
    .join('');
}
