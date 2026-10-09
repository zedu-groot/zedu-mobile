import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppText } from '@/components/ui/text';
import { useDataContext } from '@/store/useDataContext';
import { ACTIONS } from '@/store/types';
import { GetRequest, PostRequest } from '@/utils/requests';
import NotificationScreen from './notifications';

jest.mock('@/store/useDataContext', () => ({ useDataContext: jest.fn() }));
jest.mock('@/utils/requests', () => ({
  GetRequest: jest.fn(),
  PostRequest: jest.fn(),
}));
jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: require('@/theme/palettes').lightColors }),
}));
jest.mock('@/components/layout/container', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) =>
    ReactModule.createElement(NativeView, null, children);
});
// Replace only the native sheet boundary; keep the screen's rows and handlers.
jest.mock('@/components/ui/bottom-sheet', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return ReactModule.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
      ReactModule.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
      }));
      return ReactModule.createElement(
        NativeView,
        { testID: 'time-picker' },
        children,
      );
    },
  );
});

const HALF_HOUR_OPTIONS = [
  '12:00 AM',
  '12:30 AM',
  '1:00 AM',
  '1:30 AM',
  '2:00 AM',
  '2:30 AM',
  '3:00 AM',
  '3:30 AM',
  '4:00 AM',
  '4:30 AM',
  '5:00 AM',
  '5:30 AM',
  '6:00 AM',
  '6:30 AM',
  '7:00 AM',
  '7:30 AM',
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
  '10:30 PM',
  '11:00 PM',
  '11:30 PM',
];

describe('notification end-time picker', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const dispatch = jest.fn();
  const goBack = jest.fn();
  const preference = {
    notify_about: 'all_new_messages',
    time_range: '12:00 AM - 11:59 PM',
    mobile_override: true,
    send_mail: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDataContext).mockReturnValue({
      state: { orgId: 'org-009' },
      dispatch,
    } as unknown as ReturnType<typeof useDataContext>);
    jest.mocked(GetRequest).mockResolvedValue({
      data: { data: preference },
      error: null,
    });
    jest.mocked(PostRequest).mockResolvedValue({
      data: { message: 'Preferences updated' },
      error: null,
    });
  });

  afterEach(async () => {
    await act(() => renderer?.unmount());
  });

  async function renderScreen() {
    await act(async () => {
      renderer = TestRenderer.create(
        <NotificationScreen navigation={{ goBack }} />,
      );
    });
  }

  async function press(node: ReactTestInstance) {
    await act(async () => node.props.onPress());
  }

  function labeledButton(label: string) {
    return renderer.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node.findAllByType(AppText).some(text => text.props.children === label),
      )!;
  }

  function timeField(label: 'From' | 'To') {
    const box = renderer.root
      .findAllByType(View)
      .find(
        node =>
          node
            .findAllByType(AppText)
            .some(text => text.props.children === label) &&
          node.findAllByType(TouchableOpacity).length === 1,
      )!;
    return box.findByType(TouchableOpacity);
  }

  function rows() {
    return renderer.root
      .findByProps({ testID: 'time-picker' })
      .findAllByType(TouchableOpacity);
  }

  function rowLabels() {
    return rows().map(row => row.findByType(AppText).props.children);
  }

  function selectedLabels() {
    return rows()
      .filter(row =>
        row
          .findAllByType(Ionicons)
          .some(icon => icon.props.name === 'checkmark'),
      )
      .map(row => row.findByType(AppText).props.children);
  }

  async function choose(time: string) {
    const row = rows().find(
      item => item.findByType(AppText).props.children === time,
    );
    expect(row).toBeDefined();
    await press(row!);
  }

  async function restoreEndpoint() {
    await press(labeledButton('Mentions'));
    await press(timeField('From'));
    await choose('9:00 AM');
    const emailLabel = renderer.root
      .findAllByType(AppText)
      .find(text => text.props.children === 'Receive notifications via email')!;
    await press(emailLabel.parent!.findByType(TouchableOpacity));
    await press(timeField('To'));
    await choose('10:00 PM');
    await press(timeField('To'));
    await choose('11:59 PM');
    await press(timeField('To'));
  }

  it.each([
    ['loaded', preference],
    ['fallback', { ...preference, time_range: undefined }],
  ])('renders the %s all-day endpoint as selected', async (_name, loaded) => {
    jest
      .mocked(GetRequest)
      .mockResolvedValue({ data: { data: loaded }, error: null });
    await renderScreen();
    await press(timeField('To'));
    expect(rowLabels()).toEqual([...HALF_HOUR_OPTIONS, '11:59 PM']);
    expect(selectedLabels()).toEqual(['11:59 PM']);
  });

  it('restores the endpoint without discarding edits and saves the existing payload', async () => {
    await renderScreen();
    await restoreEndpoint();
    expect(timeField('From').findByType(AppText).props.children).toBe(
      '9:00 AM',
    );
    expect(timeField('To').findByType(AppText).props.children).toBe('11:59 PM');
    expect(selectedLabels()).toEqual(['11:59 PM']);
    await press(labeledButton('Save Changes'));
    expect(PostRequest).toHaveBeenCalledWith(
      '/organisations/org-009/notification-preference?device_type=mobile',
      {
        notify_about: 'mentions',
        send_mail: false,
        time_range: '9:00 AM - 11:59 PM',
        device_type: 'mobile',
        mobile_override: true,
      },
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.SUCCESS,
      payload: 'Preferences updated',
    });
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('preserves half-hour choices and loaded selection when switching pickers', async () => {
    jest.mocked(GetRequest).mockResolvedValue({
      data: { data: { ...preference, time_range: '9:00 AM - 11:30 PM' } },
      error: null,
    });
    await renderScreen();
    await press(timeField('From'));
    expect(rowLabels()).toEqual(HALF_HOUR_OPTIONS);
    expect(selectedLabels()).toEqual(['9:00 AM']);
    await press(timeField('To'));
    expect(rowLabels()).toEqual([...HALF_HOUR_OPTIONS, '11:59 PM']);
    expect(selectedLabels()).toEqual(['11:30 PM']);
    await choose('10:00 PM');
    await press(timeField('To'));
    await choose('11:30 PM');
    expect(timeField('To').findByType(AppText).props.children).toBe('11:30 PM');
    expect(selectedLabels()).toEqual(['11:30 PM']);
    await press(labeledButton('Save Changes'));
    expect(PostRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ time_range: '9:00 AM - 11:30 PM' }),
    );
  });

  it('retains restored preferences when saving fails', async () => {
    jest.mocked(PostRequest).mockResolvedValue({ data: null, error: 'failed' });
    await renderScreen();
    await restoreEndpoint();
    await press(labeledButton('Save Changes'));
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.ERROR,
      payload: 'Failed to update',
    });
    expect(goBack).not.toHaveBeenCalled();
    expect(timeField('From').findByType(AppText).props.children).toBe(
      '9:00 AM',
    );
    expect(timeField('To').findByType(AppText).props.children).toBe('11:59 PM');
    expect(selectedLabels()).toEqual(['11:59 PM']);
  });
});
