declare const GEEKLENS_DEV_USERNAME: string;
declare const GEEKLENS_DEV_PASSWORD: string;
const ATTEMPT_KEY = 'geeklens-development-login-attempted';

function fieldFor(labelText: string, fallback: string): HTMLInputElement | null {
  const label = Array.from(document.querySelectorAll('label')).find((candidate) =>
    candidate.textContent?.toLocaleLowerCase('en-US').includes(labelText),
  );
  const labelledField = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
  return labelledField instanceof HTMLInputElement
    ? labelledField
    : document.querySelector<HTMLInputElement>(fallback);
}

function logIn(): void {
  if (!GEEKLENS_DEV_USERNAME || !GEEKLENS_DEV_PASSWORD) return;
  if (sessionStorage.getItem(ATTEMPT_KEY)) {
    console.error('GeekLens: Development login was already attempted in this tab');
    return;
  }

  const username = fieldFor('username', 'form input[type="email"], form input[type="text"]');
  const password = fieldFor('password', 'form input[type="password"]');
  const form = password?.form ?? username?.form;
  if (!username || !password || !form) {
    console.error('GeekLens: Development login form fields were not found');
    return;
  }

  username.value = GEEKLENS_DEV_USERNAME;
  password.value = GEEKLENS_DEV_PASSWORD;
  const remember = form.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (remember) remember.checked = true;
  sessionStorage.setItem(ATTEMPT_KEY, 'true');
  console.debug('GeekLens: Submitting development login');
  form.requestSubmit();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', logIn, { once: true });
} else {
  logIn();
}
