export type AnnotationStatusState = 'loading' | 'active' | 'limited' | 'sign-in' | 'error';

export interface AnnotationStatus {
  state: AnnotationStatusState;
  text: string;
  action?: 'sign-in';
}

export const loadingStatus: AnnotationStatus = {
  state: 'loading',
  text: 'GeekLens: Loading result details…',
};

export const activeStatus: AnnotationStatus = {
  state: 'active',
  text: 'GeekLens Active',
};

export function completedAnnotationStatus({
  hasDetails,
  payloadComplete,
  signedOut,
}: {
  hasDetails: boolean;
  payloadComplete: boolean;
  signedOut: boolean;
}): AnnotationStatus {
  if (payloadComplete) return activeStatus;
  if (signedOut) {
    return {
      state: 'sign-in',
      text: 'GeekLens: Sign in to load result details',
      action: 'sign-in',
    };
  }
  return {
    state: 'limited',
    text: hasDetails
      ? 'GeekLens: Some result details unavailable'
      : 'GeekLens: Result details unavailable',
  };
}

export function annotationErrorStatus(text = 'GeekLens: Annotation failed'): AnnotationStatus {
  return { state: 'error', text };
}
