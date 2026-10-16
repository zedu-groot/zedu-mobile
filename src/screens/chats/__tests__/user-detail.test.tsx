import React from 'react';
import { Platform, ScrollView } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import UserDetailScreen from '../user-detail';

const mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: {} }),
}));
jest.mock('@/theme/createScreenStyles', () => ({
  createChatInfoStyles: () => new Proxy({}, { get: () => ({}) }),
}));
jest.mock('@/store/useDataContext', () => ({
  useDataContext: () => ({ state: { user: {} }, dispatch: jest.fn() }),
}));
jest.mock('@/utils/requests', () => ({
  GetRequest: jest.fn(() => Promise.resolve({ data: { data: {} } })),
  PostRequest: jest.fn(),
}));
jest.mock('@/components/layout/container', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));
jest.mock('@/components/ui/text', () => {
  const { Text } = require('react-native');
  return { AppText: Text };
});
jest.mock('@/components/layout/group-chat/add-description', () => ({
  AddDescription: () => null,
}));
jest.mock('@/components/ui/user-profile-status', () => ({
  UserProfileStatus: () => null,
}));
jest.mock('@/components/ui/contact-info-card', () => ({
  ContactInfoCard: () => null,
}));
jest.mock('@/components/ui/toast', () => ({ ShowNotify: jest.fn() }));
jest.mock('@/services/buzz.service', () => ({ __esModule: true, default: {} }));
jest.mock('react-native-fast-image', () => 'FastImage');
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const route = { params: { channel_id: 'channel-1', participant: {} } };
const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const renderScreen = async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <UserDetailScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
};

const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
});

describe('UserDetailScreen bottom space', () => {
  it('keeps the last row above the Android navigation bar', async () => {
    Platform.OS = 'android';
    mockInsets.bottom = 48;

    const renderer = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);

    expect(scroll.props.contentContainerStyle).toEqual({ paddingBottom: 64 });

    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('adds only the home indicator space on iPhone', async () => {
    Platform.OS = 'ios';
    mockInsets.bottom = 34;

    const renderer = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);

    expect(scroll.props.contentContainerStyle).toEqual({ paddingBottom: 34 });

    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('opens the media gallery when Media Visibility is tapped', async () => {
    Platform.OS = 'android';
    mockInsets.bottom = 48;

    const renderer = await renderScreen();
    const row = renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(
        node =>
          node.findAll(child => child.props.children === 'Media Visibility')
            .length,
      );

    await ReactTestRenderer.act(() => row?.props.onPress());

    expect(navigation.navigate).toHaveBeenCalledWith('MediaGalleryScreen', {
      channel_id: 'channel-1',
    });

    await ReactTestRenderer.act(() => renderer.unmount());
  });
});
