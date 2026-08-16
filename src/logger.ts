const PREFIX = 'GeekLens:';
const DEBUG = import.meta.env.DEV;

export function debugLog(message: string, ...details: unknown[]): void {
  if (DEBUG) console.debug(`${PREFIX} ${message}`, ...details);
}

export function logError(message: string, ...details: unknown[]): void {
  console.error(`${PREFIX} ${message}`, ...details);
}
