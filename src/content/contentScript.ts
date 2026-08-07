import './content.css';
import { loadSettings } from '../settings/settings';
import { routeAnnotation } from './annotationRouting';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

export async function annotateCurrentPage() {
  const settings = await loadSettings();
  return routeAnnotation(window.location.pathname, settings, {
    single: annotateGeekbenchResults,
    comparison: annotateGeekbenchComparisonPage,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateCurrentPage, { once: true });
} else {
  annotateCurrentPage();
}
