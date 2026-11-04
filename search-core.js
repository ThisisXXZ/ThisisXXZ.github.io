export const queryTerms = (query) =>
  String(query).trim().slice(0, 200).split(/\s+/u).filter(Boolean).slice(0, 12);

export function createSearchEngine(entries, { convert = (text) => text } = {}) {
  const normalize = (text) =>
    convert(
      String(text || '')
        .normalize('NFKC')
        .toLowerCase()
    );
  const documents = entries.map((entry) => ({
    entry,
    title: normalize(entry.title),
    label: normalize(entry.label),
    text: normalize(entry.text),
  }));
  return (query, { section = '' } = {}) => {
    const terms = queryTerms(normalize(query));
    if (!terms.length) return [];
    const results = [];
    for (const document of documents) {
      if (section && document.entry.section !== section) continue;
      if (
        !terms.every(
          (term) =>
            document.title.includes(term) || document.label.includes(term) || document.text.includes(term)
        )
      )
        continue;
      let score = document.title === terms.join(' ') ? 1000 : 0;
      for (const term of terms)
        score += document.title.includes(term) ? 100 : document.label.includes(term) ? 10 : 1;
      const matches = terms.map((term) => document.text.indexOf(term)).filter((position) => position >= 0);
      const position = matches.length ? Math.min(...matches) : 0;
      // Normalization may change string lengths slightly; the excerpt is approximate, never HTML.
      const start = Math.max(0, position - 40);
      const excerpt = Array.from(document.entry.text.slice(start)).slice(0, 170).join('');
      results.push({
        ...document.entry,
        score,
        excerpt:
          (start ? '…' : '') + excerpt + (start + excerpt.length < document.entry.text.length ? '…' : ''),
      });
    }
    return results.sort(
      (a, b) => b.score - a.score || b.date.localeCompare(a.date) || a.url.localeCompare(b.url)
    );
  };
}
