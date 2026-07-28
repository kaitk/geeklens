import './content.css';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

export function isComparisonPage(pathname: string): boolean {
  return /^\/v[67]\/cpu\/compare\//.test(pathname);
}

export function annotateCurrentPage() {
  if (isComparisonPage(window.location.pathname)) {
    return annotateGeekbenchComparisonPage();
  }
  return annotateGeekbenchResults();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateCurrentPage, { once: true });
} else {
  annotateCurrentPage();
}
