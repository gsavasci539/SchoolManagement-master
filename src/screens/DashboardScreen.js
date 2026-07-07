import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import useAuthStore from '../store/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../config/theme';
import { moderateScale, moderateVerticalScale, getColumnCount, getCardWidth, getBottomPadding, getTabBarHeight, getResponsiveContainerStyle, responsiveIconSize, useResponsive } from '../utils/responsive';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { width, columnCount, tabBarHeight, deviceType } = useResponsive();
  const cardWidth = getCardWidth(columnCount, spacing.lg, spacing.lg);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(() => [
    {
      icon: 'people-outline',
      title: 'Toplam Öğrenci',
      value: stats?.total_students,
      statBg: '#e6f3ef',
      statInk: colors.brand,
      onPress: () => navigation.navigate('Students'),
    },
    {
      icon: 'cash-outline',
      title: 'Toplam Ödeme',
      value: stats?.total_payments,
      statBg: '#e8f5f0',
      statInk: colors.success,
      onPress: () => navigation.navigate('Finance'),
    },
    {
      icon: 'calendar-outline',
      title: 'Bugün Yoklama',
      value: stats?.today_attendance,
      statBg: '#fff3df',
      statInk: colors.warning,
      onPress: () => navigation.navigate('Attendance'),
    },
    {
      icon: 'notifications-outline',
      title: 'Bildirimler',
      value: stats?.notifications,
      statBg: '#fff0ef',
      statInk: colors.danger,
      onPress: () => navigation.navigate('Communications'),
    },
  ], [stats]);

  const quickActions = useMemo(() => [
    {
      icon: 'person-add-outline',
      title: 'Öğrenci Ekle',
      subtitle: 'Yeni öğrenci kaydı',
      bg: '#e6f3ef',
      color: colors.brand,
      onPress: () => navigation.navigate('Students'),
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Yoklama Al',
      subtitle: 'Sınıf yoklaması',
      bg: '#e8f5f0',
      color: colors.success,
      onPress: () => navigation.navigate('Attendance'),
    },
    {
      icon: 'card-outline',
      title: 'Ödeme Al',
      subtitle: 'Ödeme kaydı',
      bg: '#fff3df',
      color: colors.warning,
      onPress: () => navigation.navigate('Finance'),
    },
    {
      icon: 'school-outline',
      title: 'Sınıflar',
      subtitle: 'Sınıf yönetimi',
      bg: '#e8f4fd',
      color: '#2563eb',
      onPress: () => navigation.navigate('Classes'),
    },
    {
      icon: 'chatbubbles-outline',
      title: 'İletişim',
      subtitle: 'Duyuru ve bildirimler',
      bg: '#fef3c7',
      color: '#d97706',
      onPress: () => navigation.navigate('Communications'),
    },
    {
      icon: 'bar-chart-outline',
      title: 'Raporlar',
      subtitle: 'Detaylı raporlar',
      bg: '#fff0ef',
      color: colors.danger,
      onPress: () => navigation.navigate('Reports'),
    },
    {
      icon: 'library-outline',
      title: 'Kaynaklar',
      subtitle: 'Şube ve kullanıcılar',
      bg: '#f3e8ff',
      color: '#9333ea',
      onPress: () => navigation.navigate('Resources'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Roller',
      subtitle: 'Rol ve yetki yönetimi',
      bg: '#ecfdf5',
      color: '#059669',
      onPress: () => navigation.navigate('Roles'),
    },
    {
      icon: 'person-circle-outline',
      title: 'Kullanıcılar',
      subtitle: 'Kullanıcı yönetimi',
      bg: '#fff1f2',
      color: '#dc2626',
      onPress: () => navigation.navigate('Users'),
    },
  ], []);

  const bottomPadding = getBottomPadding(tabBarHeight);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[getResponsiveContainerStyle(), styles.content]}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Kullanıcı'}</Text>
          </View>

          <FlatList
            data={statCards}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.statCard, { width: cardWidth }]} 
                onPress={item.onPress}
              >
                <View style={[styles.statIcon, { backgroundColor: item.statBg }]}>
                  <Ionicons name={item.icon} size={responsiveIconSize(19)} color={item.statInk} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>{item.title}</Text>
                  <Text style={styles.statValue}>{item.value || '—'}</Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            numColumns={columnCount}
            scrollEnabled={false}
            columnWrapperStyle={styles.statsGrid}
            contentContainerStyle={styles.statsContainer}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
            <View style={styles.quickList}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickItem}
                  onPress={action.onPress}
                >
                  <View style={[styles.quickIcon, { backgroundColor: action.bg }]}>
                    <Ionicons name={action.icon} size={responsiveIconSize(17)} color={action.color} />
                  </View>
                  <View style={styles.quickCopy}>
                    <Text style={styles.quickCopyTitle}>{action.title}</Text>
                    <Text style={styles.quickCopySubtitle}>{action.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={responsiveIconSize(18)} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: spacing.xl,
  },
  welcomeText: {
    fontSize: fontSize.lg,
    color: colors.muted,
  },
  userName: {
    fontSize: fontSize.giant,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
    marginTop: 4,
  },
  statsContainer: {
    paddingVertical: spacing.lg,
  },
  statsGrid: {
    gap: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    padding: spacing.lg,
    minHeight: moderateVerticalScale(110),
    justifyContent: 'center',
    ...shadows.small,
  },
  statIcon: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    lineHeight: moderateVerticalScale(16),
  },
  statValue: {
    fontSize: fontSize.giant,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
    marginTop: spacing.xs,
    lineHeight: moderateVerticalScale(30),
  },
  section: {
    paddingVertical: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  quickList: {
    gap: spacing.sm,
    padding: 0,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    minHeight: moderateVerticalScale(75),
    ...shadows.small,
  },
  quickIcon: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCopy: {
    flex: 1,
  },
  quickCopyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  quickCopySubtitle: {
    marginTop: moderateScale(3),
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
