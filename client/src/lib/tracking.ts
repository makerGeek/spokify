// Centralized tracking utilities
import { setUserContext, clearUserContext, captureUserAction } from './sentry'
import { setUserIdentity, trackUserAction } from './clarity'

export function setupUserTracking(user: any) {
  if (!user) return;
  
  // Set user context for error tracking
  setUserContext({
    id: user.id.toString(),
    email: user.email,
    subscription: user.subscriptionStatus
  });
  
  // Set user identity for analytics
  setUserIdentity(user.id.toString(), {
    email: user.email,
    subscription_status: user.subscriptionStatus,
    target_language: user.targetLanguage,
    native_language: user.nativeLanguage
  });
}

export function clearUserTracking() {
  clearUserContext();
}

export function trackLogin(method: string, user?: any) {
  trackUserAction('user_login', {
    method,
    subscription_status: user?.subscriptionStatus
  });
  captureUserAction('login', { method });
}

export function trackLogout() {
  trackUserAction('user_logout');
  captureUserAction('logout');
}

export function trackSubscriptionChange(event: string, plan?: string) {
  trackUserAction('subscription_change', { event, plan });
  captureUserAction('subscription_change', { event, plan });
}

export function trackLearningActivity(activity: string, details?: any) {
  trackUserAction('learning_activity', { activity, ...details });
  captureUserAction('learning_activity', { activity, ...details });
}