/**
 * Curator Desk Ad-Hoc Ingest Panel String Resources SSOT.
 * Kept as a sibling file since strings.ts is already near its 300-LOC limit.
 * Hard limit: <= 300 LOC.
 */

const ingestStrings = {
  tabLabel: '📥 Ingest Story',
  heading: 'Ad-Hoc Story Ingestion',
  subheading: 'Pull in a story by URL, or paste article text directly — it publishes live immediately, no waiting for the next crawl.',
  modeUrlLabel: 'From URL',
  modeTextLabel: 'Paste Text',
  urlPlaceholder: 'https://example.com/article',
  textPlaceholder: 'Paste the article text here...',
  sourceNamePlaceholder: 'Source name (optional)',
  submitBtn: 'Ingest & Publish',
  submitting: 'Ingesting…',
  successMessage: 'Story ingested and published live.',
  emptyUrlError: 'Enter a URL to ingest.',
  emptyTextError: 'Paste some article text to ingest.',
  genericError: 'Ingestion failed.'
} as const;

export default ingestStrings;
