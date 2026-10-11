import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { AppText } from './text';
import { normalize } from '../../utils/normalize';
import { useTheme } from '@/theme/ThemeProvider';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  allowFontScaling?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  style,
  disabled = false,
  leadingIcon,
  accessibilityLabel,
  accessibilityHint,
  allowFontScaling = false,
}) => {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          height: normalize(56),
          borderRadius: normalize(12),
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          flexDirection: 'row',
          gap: 6,
        },
        primaryBtn: {
          backgroundColor: colors.primary,
        },
        dangerBtn: {
          backgroundColor: colors.error,
        },
        secondaryBtn: {
          backgroundColor: colors.transparent,
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        primaryText: {
          color: colors.white,
        },
        dangerText: {
          color: colors.white,
        },
        secondaryText: {
          color: colors.primary,
        },
      }),
    [colors],
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      style={[
        styles.button,
        isPrimary
          ? styles.primaryBtn
          : isDanger
          ? styles.dangerBtn
          : styles.secondaryBtn,
        style,
        disabled && { opacity: 0.6 },
      ]}
    >
      {leadingIcon}
      {loading && (
        <ActivityIndicator
          color={isPrimary || isDanger ? colors.white : colors.primary}
        />
      )}

      <AppText
        allowFontScaling={allowFontScaling}
        variant="semiBold"
        size={16}
        style={
          isPrimary
            ? styles.primaryText
            : isDanger
            ? styles.dangerText
            : styles.secondaryText
        }
      >
        {title}
      </AppText>
    </TouchableOpacity>
  );
};
