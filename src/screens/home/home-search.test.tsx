import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import HomeScreen from './index';
import { useDMs } from '@/services/chat/chat-lists';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}) }));
jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: require('@/theme/palettes').lightColors }),
}));
jest.mock('@/store/useDataContext', () => ({
  useDataContext: () => ({ state: { dms: [] }, dispatch: jest.fn() }),
}));
jest.mock('@/services/chat/chat-lists', () => ({ useDMs: jest.fn() }));
jest.mock('@/utils/requests', () => ({ PutRequest: jest.fn() }));
jest.mock('@/components/layout/container', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/layout/popover', () => ({
  AppPopover: () => null,
}));
jest.mock('@/components/ui/user-avatar-with-status', () => ({
  UserAvatarWithStatus: () => null,
}));
jest.mock('@/services/org/get-org', () => () => null);
jest.mock('@/centrifugoo/general-notification-connection', () => () => null);
jest.mock('@/components/skeleton/chat-skeleton', () => () => null);

const mockUseDMs = jest.mocked(useDMs);

it.each([false, true])(
  'clears conversation search and updates the existing search hook (loading=%s)',
  async loading => {
    mockUseDMs.mockReturnValue({
      loading,
      loadingMore: false,
      refresh: jest.fn(),
      loadMore: jest.fn(),
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });
    const clearButtons = () =>
      renderer.root
        .findAllByType(TouchableOpacity)
        .filter(
          node => node.props.accessibilityLabel === 'Clear conversation search',
        );

    expect(clearButtons()).toHaveLength(0);
    await act(async () => {
      renderer.root.findByType(TextInput).props.onChangeText('Alice');
    });
    expect(renderer.root.findByType(TextInput).props.value).toBe('Alice');
    expect(mockUseDMs).toHaveBeenLastCalledWith(undefined, 'Alice');
    expect(clearButtons()).toHaveLength(1);
    expect(clearButtons()[0].props.accessibilityRole).toBe('button');
    expect(clearButtons()[0].props.hitSlop).toBe(12);
    expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(
      loading ? 1 : 0,
    );

    await act(async () => {
      clearButtons()[0].props.onPress();
    });
    expect(renderer.root.findByType(TextInput).props.value).toBe('');
    expect(mockUseDMs).toHaveBeenLastCalledWith(undefined, '');
    expect(clearButtons()).toHaveLength(0);
    await act(async () => renderer.unmount());
  },
);
