/**
 * Curator Desk — Ad-Hoc Ingest Story View (Phase 4) for DefenceWire.in
 * URL-or-pasted-text form that ingests, clusters, and publishes a single
 * story immediately via /api/curator/ingest.
 * Hard limit: <= 300 LOC.
 */

import { CuratorIngestViewModel, CuratorIngestMode } from '../../viewmodels/CuratorIngestViewModel.js';
import { STRINGS } from '../../resources/strings.js';

export function renderIngestView(vm: CuratorIngestViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';
  container.appendChild(contentArea);

  const heading = document.createElement('h3');
  heading.textContent = STRINGS.ingest.heading;
  contentArea.appendChild(heading);

  const subheading = document.createElement('p');
  subheading.style.color = 'var(--dw-text-muted)';
  subheading.style.fontSize = '0.82rem';
  subheading.textContent = STRINGS.ingest.subheading;
  contentArea.appendChild(subheading);

  // Mode toggle (URL vs Text — mutually exclusive)
  const modeTabs = document.createElement('div');
  modeTabs.className = 'dw-editor-filters';
  modeTabs.style.marginBottom = '10px';

  const modes: Array<{ mode: CuratorIngestMode; label: string }> = [
    { mode: 'url', label: STRINGS.ingest.modeUrlLabel },
    { mode: 'text', label: STRINGS.ingest.modeTextLabel }
  ];
  for (const { mode, label } of modes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-editor-filter-tab ${vm.getMode() === mode ? 'active' : ''}`;
    btn.textContent = label;
    btn.onclick = () => vm.setMode(mode);
    modeTabs.appendChild(btn);
  }
  contentArea.appendChild(modeTabs);

  const form = document.createElement('div');
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  form.style.gap = '8px';
  form.style.maxWidth = '520px';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'dw-editor-btn dw-editor-btn--publish';
  submitBtn.textContent = vm.getIsSubmitting() ? `⏳ ${STRINGS.ingest.submitting}` : `📥 ${STRINGS.ingest.submitBtn}`;
  submitBtn.onclick = () => {
    void vm.submit();
  };

  const refreshSubmitEnabled = () => {
    const hasInput = vm.getMode() === 'url' ? vm.getUrlValue().trim().length > 0 : vm.getTextValue().trim().length > 0;
    submitBtn.disabled = vm.getIsSubmitting() || !hasInput;
  };

  if (vm.getMode() === 'url') {
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'dw-editor-input';
    urlInput.placeholder = STRINGS.ingest.urlPlaceholder;
    urlInput.value = vm.getUrlValue();
    urlInput.oninput = (e) => {
      vm.setUrlValue((e.target as HTMLInputElement).value);
      refreshSubmitEnabled();
    };
    form.appendChild(urlInput);
  } else {
    const sourceInput = document.createElement('input');
    sourceInput.type = 'text';
    sourceInput.className = 'dw-editor-input';
    sourceInput.placeholder = STRINGS.ingest.sourceNamePlaceholder;
    sourceInput.value = vm.getSourceNameValue();
    sourceInput.oninput = (e) => vm.setSourceNameValue((e.target as HTMLInputElement).value);
    form.appendChild(sourceInput);

    const textArea = document.createElement('textarea');
    textArea.className = 'dw-editor-textarea';
    textArea.placeholder = STRINGS.ingest.textPlaceholder;
    textArea.value = vm.getTextValue();
    textArea.oninput = (e) => {
      vm.setTextValue((e.target as HTMLTextAreaElement).value);
      refreshSubmitEnabled();
    };
    form.appendChild(textArea);
  }

  refreshSubmitEnabled();
  form.appendChild(submitBtn);

  contentArea.appendChild(form);

  const status = vm.getStatusMessage();
  if (status) {
    const banner = document.createElement('p');
    banner.style.fontSize = '0.82rem';
    banner.style.fontWeight = '600';
    banner.style.marginTop = '8px';
    banner.style.color = vm.getIsError() ? 'var(--dw-text-accent)' : 'var(--dw-badge-text)';
    banner.textContent = status;
    contentArea.appendChild(banner);
  }

  return container;
}
