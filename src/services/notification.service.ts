import { Platform } from 'react-native';
import PushNotificationIOS, {
  PushNotification,
} from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PutRequest } from '@/utils/requests';

const APNS_TOKEN_STORAGE_KEY = 'ios_apns_device_token';

let cachedDeviceToken: string | null = null;

/**
 * Requests push notification permissions from iOS.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return true;
  }

  try {
    const permissions = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });
    return Boolean(
      permissions?.alert || permissions?.badge || permissions?.sound,
    );
  } catch (error) {
    console.warn('[NotificationService] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Sends the APNs device token to the backend server.
 * Handles missing or evolving backend endpoints gracefully without crashing.
 */
export async function syncPushTokenWithBackend(token: string): Promise<void> {
  try {
    const payload = {
      token,
      platform: 'ios',
      bundle_id: 'net.emerj.zedu',
    };

    // Attempt to register device token with backend
    const { error } = await PutRequest('/users/device-token', payload);
    if (error) {
      // Endpoint may not be active yet during transition
      console.log(
        '[NotificationService] Backend push token sync skipped/pending:',
        error,
      );
    } else {
      console.log('[NotificationService] APNs token registered with backend.');
    }
  } catch (e) {
    console.log('[NotificationService] Backend registration bypassed:', e);
  }
}

/**
 * Retrieves the currently stored APNs device token.
 */
export async function getStoredApnsToken(): Promise<string | null> {
  if (cachedDeviceToken) return cachedDeviceToken;
  try {
    cachedDeviceToken = await AsyncStorage.getItem(APNS_TOKEN_STORAGE_KEY);
    return cachedDeviceToken;
  } catch {
    return null;
  }
}

export interface NotificationServiceListeners {
  onNotificationReceived?: (notification: PushNotification) => void;
  onNotificationClicked?: (notification: PushNotification) => void;
  onTokenRegistered?: (token: string) => void;
}

/**
 * Initializes iOS push notifications and binds event listeners.
 * Returns an unsubscribe callback for clean unmounting.
 */
export function initPushNotifications(
  listeners?: NotificationServiceListeners,
): () => void {
  if (Platform.OS !== 'ios') {
    return () => {};
  }

  // 1. Handle device token registration
  const onRegister = async (deviceToken: string) => {
    cachedDeviceToken = deviceToken;
    console.log('====================================================');
    console.log('[iOS Push Notification] APNs Device Token:');
    console.log(deviceToken);
    console.log('====================================================');

    try {
      await AsyncStorage.setItem(APNS_TOKEN_STORAGE_KEY, deviceToken);
    } catch {}

    listeners?.onTokenRegistered?.(deviceToken);
    await syncPushTokenWithBackend(deviceToken);
  };

  const onRegistrationError = (error: any) => {
    console.warn(
      '[NotificationService] Failed to register for remote notifications:',
      error,
    );
  };

  // 2. Handle remote notification events
  const onNotification = (notification: PushNotification) => {
    // When the user taps a notification banner/alert, PushNotificationIOS receives
    // the event with userInteraction === 1 (or clicked response).
    const isClicked = Boolean(
      (notification as any)?.userInteraction ||
        (notification as any)?._data?.userInteraction,
    );

    if (isClicked) {
      listeners?.onNotificationClicked?.(notification);
    } else {
      listeners?.onNotificationReceived?.(notification);
    }

    // Call finish to tell iOS the notification processing has completed
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  };

  PushNotificationIOS.addEventListener('register', onRegister);
  PushNotificationIOS.addEventListener(
    'registrationError',
    onRegistrationError,
  );
  PushNotificationIOS.addEventListener('notification', onNotification);

  // 3. Request permissions & trigger APNs registration
  requestNotificationPermissions().catch(() => {});

  // 4. Check if the app was launched by tapping a push notification (cold start)
  PushNotificationIOS.getInitialNotification()
    .then(initialNotification => {
      if (initialNotification) {
        console.log(
          '[NotificationService] Cold start from notification:',
          initialNotification,
        );
        listeners?.onNotificationClicked?.(initialNotification);
      }
    })
    .catch(err => {
      console.warn(
        '[NotificationService] Error checking initial notification:',
        err,
      );
    });

  return () => {
    PushNotificationIOS.removeEventListener('register');
    PushNotificationIOS.removeEventListener('registrationError');
    PushNotificationIOS.removeEventListener('notification');
  };
}
