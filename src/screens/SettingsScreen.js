import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import useAuthStore from '../store/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../config/theme';
import { getBottomPadding, getTabBarHeight, getResponsiveContainerStyle, responsiveIconSize, useResponsive, moderateScale } from '../utils/responsive';
import CustomAlert from '../components/CustomAlert';

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const { tabBarHeight } = useResponsive();
  const bottomPadding = getBottomPadding(tabBarHeight);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
  });

  const showAlert = (title, message, type = 'info', onConfirm = null, showCancel = false) => {
    setAlertConfig({
      visible: true,
      title: title || '',
      message: message || '',
      type,
      onConfirm: onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false }))),
      showCancel,
    });
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      logout();
      navigation.getParent()?.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      navigation.getParent()?.replace('Login');
    }
  };

  const openProfileModal = () => {
    setProfileData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setProfileModalVisible(true);
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', profileData);
      await fetchUserProfile();
      setProfileModalVisible(false);
      showAlert('Başarılı', 'Profil güncellendi', 'success');
    } catch (error) {
      console.error('Save profile error:', error);
      showAlert('Hata', 'Profil güncellenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[getResponsiveContainerStyle(), styles.content]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Ayarlar</Text>
          </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name || 'Kullanıcı'}</Text>
            <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
            <Text style={styles.profileRole}>{user?.role || '—'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Genel</Text>
        <TouchableOpacity style={styles.settingItem} onPress={openProfileModal}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="person-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Profil Düzenle</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => showAlert('Bilgi', 'Bildirim ayarları yakında eklenecek', 'info')}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="notifications-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Bildirimler</Text>
            <Text style={styles.settingSubtitle}>Bildirim tercihlerini yönet</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => showAlert('Bilgi', 'Dil seçimi yakında eklenecek', 'info')}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="language-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Dil</Text>
            <Text style={styles.settingSubtitle}>Türkçe</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        <TouchableOpacity style={styles.settingItem} onPress={() => showAlert('Okul360', 'Okul Yönetim Sistemi Mobil Uygulaması\nVersiyon 1.0.0', 'info')}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="information-circle-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Hakkında</Text>
            <Text style={styles.settingSubtitle}>Okul360 v1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => showAlert('Bilgi', 'Gizlilik politikası yakında eklenecek', 'info')}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="document-text-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Gizlilik Politikası</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => showAlert('Bilgi', 'Yardım ve destek yakında eklenecek', 'info')}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand + '20' }]}>
            <Ionicons name="help-circle-outline" size={responsiveIconSize(19)} color={colors.brand} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Yardım ve Destek</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={responsiveIconSize(19)} color={colors.danger} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>

    {/* Profile Edit Modal */}
    <Modal
      visible={profileModalVisible}
      animationType="slide"
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
            <Ionicons name="close" size={responsiveIconSize(24)} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Profil Düzenle</Text>
          <TouchableOpacity onPress={saveProfile} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Text style={styles.modalSave}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.formInput}
              value={profileData.full_name}
              onChangeText={(text) => setProfileData({ ...profileData, full_name: text })}
              placeholder="Adınız Soyadınız"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>E-posta</Text>
            <TextInput
              style={styles.formInput}
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="E-posta adresiniz"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Telefon</Text>
            <TextInput
              style={styles.formInput}
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Telefon numaranız"
              keyboardType="phone-pad"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>

    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      type={alertConfig.type}
      onConfirm={alertConfig.onConfirm}
      onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
      showCancel={alertConfig.showCancel}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: spacing.xl,
  },
  headerTitle: {
    fontSize: fontSize.giant,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    borderRadius: borderRadius.xxxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.small,
  },
  avatar: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  profileRole: {
    fontSize: fontSize.xs,
    color: colors.text.light,
    marginTop: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xxxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.small,
  },
  iconContainer: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    borderRadius: borderRadius.xxxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.small,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.danger,
    marginLeft: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingBottom: 70,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: 60,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  modalSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.brand,
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    ...shadows.small,
  },
});
