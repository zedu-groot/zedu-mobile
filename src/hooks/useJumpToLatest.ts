import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

interface Props {
  conversationId: string;
  enabled: boolean;
  ready: boolean;
  messageCount: number;
}

export function useJumpToLatest({
  conversationId,
  enabled,
  ready,
  messageCount,
}: Props) {
  const metrics = useRef({ viewport: 0, content: 0, offset: 0 });
  const [visibility, setVisibility] = useState({
    conversationId,
    visible: false,
  });
  const [reduceMotion, setReduceMotion] = useState(true);
  const eligible = enabled && ready && messageCount > 0;

  useEffect(() => {
    metrics.current = { viewport: 0, content: 0, offset: 0 };
    setVisibility({ conversationId, visible: false });
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      value => {
        preferenceChanged = true;
        if (active) setReduceMotion(value);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active && !preferenceChanged) setReduceMotion(value);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const updateVisibility = useCallback(() => {
    const { viewport, content, offset } = metrics.current;
    setVisibility(previous => {
      const wasVisible =
        previous.conversationId === conversationId && previous.visible;
      const visible =
        eligible &&
        viewport > 0 &&
        content > viewport &&
        offset > 48 &&
        (wasVisible || offset >= viewport);
      if (
        previous.conversationId === conversationId &&
        previous.visible === visible
      ) {
        return previous;
      }
      return { conversationId, visible };
    });
  }, [conversationId, eligible]);

  useEffect(updateVisibility, [updateVisibility]);

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      metrics.current = {
        offset: Math.max(0, nativeEvent.contentOffset.y),
        viewport: nativeEvent.layoutMeasurement.height,
        content: nativeEvent.contentSize.height,
      };
      updateVisibility();
    },
    [updateVisibility],
  );
  const onLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      metrics.current.viewport = nativeEvent.layout.height;
      updateVisibility();
    },
    [updateVisibility],
  );
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metrics.current.content = height;
      updateVisibility();
    },
    [updateVisibility],
  );

  return {
    visible:
      eligible &&
      visibility.conversationId === conversationId &&
      visibility.visible,
    animated: !reduceMotion,
    onScroll,
    onLayout,
    onContentSizeChange,
  };
}
