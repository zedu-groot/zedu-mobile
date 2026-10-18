import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {
  requestNotificationPermissions,
  syncPushTokenWithBackend,
  getStoredApnsToken,
  initPushNotifications,
} from '@/services/notification.service';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as requests from '@/utils/requests';

jest.mock('@react-native-community/push-notification-ios', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestPermissions: jest
    .fn()
    .mockResolvedValue({ alert: true, badge: true, sound: true }),
  abandonPermissions: jest.fn(),
  checkPermissions: jest.fn(cb =>
    cb({ alert: true, badge: true, sound: true }),
  ),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  getBadgeCount: jest.fn(cb => cb(0)),
  setBadgeCount: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  getScheduledLocalNotifications: jest.fn(cb => cb([])),
  presentLocalNotification: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  setApplicationIconBadgeNumber: jest.fn(),
  getApplicationIconBadgeNumber: jest.fn(cb => cb(0)),
  FetchResult: {
    NewData: 'UIBackgroundFetchResultNewData',
    NoData: 'UIBackgroundFetchResultNoData',
    ResultFailed: 'UIBackgroundFetchResultFailed',
  },
}));

Platform.OS = 'ios';

describe('notification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNotificationPermissions', () => {
    it('requests iOS permissions and returns true when granted', async () => {
      (
        PushNotificationIOS.requestPermissions as jest.Mock
      ).mockResolvedValueOnce({
        alert: true,
        badge: true,
        sound: true,
      });

      const granted = await requestNotificationPermissions();
      expect(PushNotificationIOS.requestPermissions).toHaveBeenCalledWith({
        alert: true,
        badge: true,
        sound: true,
      });
      expect(granted).toBe(true);
    });

    it('returns false when permissions request fails', async () => {
      (
        PushNotificationIOS.requestPermissions as jest.Mock
      ).mockRejectedValueOnce(new Error('Permission denied'));

      const granted = await requestNotificationPermissions();
      expect(granted).toBe(false);
    });
  });

  describe('syncPushTokenWithBackend', () => {
    it('calls PutRequest with device token payload', async () => {
      const putSpy = jest
        .spyOn(requests, 'PutRequest')
        .mockResolvedValueOnce({ data: { success: true }, error: null } as any);

      await syncPushTokenWithBackend('sample_test_token_123');

      expect(putSpy).toHaveBeenCalledWith('/users/device-token', {
        token: 'sample_test_token_123',
        platform: 'ios',
        bundle_id: 'net.emerj.zedu',
      });
    });

    it('handles backend error gracefully without throwing', async () => {
      jest.spyOn(requests, 'PutRequest').mockResolvedValueOnce({
        data: null,
        error: 'Endpoint not found',
      } as any);

      await expect(
        syncPushTokenWithBackend('sample_test_token_123'),
      ).resolves.not.toThrow();
    });
  });

  describe('getStoredApnsToken', () => {
    it('retrieves cached token from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        'cached_token_456',
      );

      const token = await getStoredApnsToken();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'ios_apns_device_token',
      );
      expect(token).toBe('cached_token_456');
    });
  });

  describe('initPushNotifications', () => {
    it('registers event listeners and returns cleanup function', () => {
      const onTokenRegistered = jest.fn();
      const onNotificationReceived = jest.fn();
      const onNotificationClicked = jest.fn();

      const unsubscribe = initPushNotifications({
        onTokenRegistered,
        onNotificationReceived,
        onNotificationClicked,
      });

      expect(PushNotificationIOS.addEventListener).toHaveBeenCalledWith(
        'register',
        expect.any(Function),
      );
      expect(PushNotificationIOS.addEventListener).toHaveBeenCalledWith(
        'registrationError',
        expect.any(Function),
      );
      expect(PushNotificationIOS.addEventListener).toHaveBeenCalledWith(
        'notification',
        expect.any(Function),
      );

      unsubscribe();

      expect(PushNotificationIOS.removeEventListener).toHaveBeenCalledWith(
        'register',
      );
      expect(PushNotificationIOS.removeEventListener).toHaveBeenCalledWith(
        'registrationError',
      );
      expect(PushNotificationIOS.removeEventListener).toHaveBeenCalledWith(
        'notification',
      );
    });
  });
});
