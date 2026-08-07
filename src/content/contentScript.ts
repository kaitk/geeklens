import './content.css';
import { isComparisonPath } from '../geekbench/generation';
import { loadSettings } from '../settings/settings';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

export async function annotateCurrentPage() {
  const settings = await loadSettings();
  if (!settings.enabled) return;
  return isComparisonPath(window.location.pathname)
    ? annotateGeekbenchComparisonPage(settings)
    : annotateGeekbenchResults(settings);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateCurrentPage, { once: true });
} else {
  annotateCurrentPage();
}
