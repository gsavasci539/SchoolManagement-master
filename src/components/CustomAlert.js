import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../config/theme';
import { moderateScale, moderateVerticalScale } from '../utils/responsive';

export default function CustomAlert({
  visible,
  title = '',
  message = '',
  type = 'info',
  onConfirm = null,
  onCancel = null,
  confirmText = 'Tamam',
  cancelText = 'İptal',
  showCancel = false,
  loading = false,
}) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleConfirm = () => {
    if (!loading && typeof onConfirm === 'function') {
      try {
        onConfirm();
      } catch (error) {
        console.error('CustomAlert onConfirm error:', error);
      }
    }
  };

  const handleCancel = () => {
    if (!loading && typeof onCancel === 'function') {
      try {
        onCancel();
      } catch (error) {
        console.error('CustomAlert onCancel error:', error);
      }
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'alert-circle';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.brand;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#e6f3ef';
      case 'error':
        return '#fff0ef';
      case 'warning':
        return '#fff3df';
      case 'danger':
        return '#fff0ef';
      default:
        return '#e8f4fd';
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor() }]}>
            <Ionicons name={getIconName()} size={moderateScale(48)} color={getIconColor()} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          {message && <Text style={styles.message}>{message}</Text>}
          
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: moderateScale(400),
    alignItems: 'center',
    ...shadows.large,
  },
  iconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: moderateVerticalScale(22),
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateVerticalScale(44),
  },
  confirmButton: {
    backgroundColor: colors.brand,
  },
  cancelButton: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
