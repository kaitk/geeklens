import './content.css';
import { isComparisonPath } from '../geekbench/generation';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

export function annotateCurrentPage() {
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
