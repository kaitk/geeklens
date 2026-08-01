import './content.css';
import { isComparisonPath } from '../geekbench/generation';
import { loadSettings } from '../settings/settings';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

export async function annotateCurrentPage() {
  const settings = await loadSettings();
  if (!settings.enabled) return;

  if (isComparisonPath(window.location.pathname)) {
    return annotateGeekbenchComparisonPage();
  }
  return annotateGeekbenchResults();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateCurrentPage, { once: true });
} else {
  annotateCurrentPage();
}
