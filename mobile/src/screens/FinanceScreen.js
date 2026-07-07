import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../config/theme';
import { moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { getBottomPadding, getTabBarHeight, getResponsiveContainerStyle, responsiveIconSize, useResponsive } from '../utils/responsive';

export default function FinanceScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    description: '',
    amount: '',
    due_date: '',
    status: 'pending',
  });
  const [students, setStudents] = useState([]);
  const { tabBarHeight } = useResponsive();
  const bottomPadding = getBottomPadding(tabBarHeight);

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, []);

  useEffect(() => {
    let filtered = payments;
    
    if (searchText) {
      filtered = filtered.filter(
        (payment) =>
          payment.student_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          payment.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedTab !== 'all') {
      filtered = filtered.filter((payment) => payment.status === selectedTab);
    }

    setFilteredPayments(filtered);
  }, [searchText, selectedTab, payments]);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      const data = response.data?.items || response.data || [];
      setPayments(Array.isArray(data) ? data : []);
      setFilteredPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Payments fetch error:', error);
      setPayments([]);
      setFilteredPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      const data = response.data?.items || response.data || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Students fetch error:', error);
      setStudents([]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'overdue':
        return colors.danger;
      default:
        return colors.muted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Ödendi';
      case 'pending':
        return 'Bekliyor';
      case 'overdue':
        return 'Gecikmiş';
      default:
        return status;
    }
  };

  const savePayment = async () => {
    try {
      if (editingPayment) {
        await api.put(`/payments/${editingPayment.id}`, formData);
      } else {
        await api.post('/payments', formData);
      }
      setModalVisible(false);
      fetchPayments();
    } catch (error) {
      console.error('Save payment error:', error);
      alert('Kaydedilemedi');
    }
  };

  const renderPayment = ({ item }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => {
        setSelectedPayment(item);
        setReceiptVisible(true);
      }}
    >
      <View style={styles.paymentInfo}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <View style={styles.paymentDetails}>
          <Text style={styles.studentName}>{item.student_name || '—'}</Text>
          <Text style={styles.description}>{item.description || '—'}</Text>
          <Text style={styles.date}>{item.due_date || '—'}</Text>
        </View>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>₺{item.amount?.toFixed(2) || '0.00'}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[getResponsiveContainerStyle(), styles.content]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finans</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingPayment(null);
              setFormData({ student_id: '', student_name: '', description: '', amount: '', due_date: '', status: 'pending' });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={responsiveIconSize(24)} color={colors.surface} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {['all', 'paid', 'pending', 'overdue'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}
              >
                {tab === 'all' ? 'Tümü' : getStatusText(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={responsiveIconSize(18)} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ödeme ara..."
            placeholderTextColor={colors.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <FlatList
          data={filteredPayments}
          renderItem={renderPayment}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={responsiveIconSize(52)} color={colors.muted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>Ödeme bulunamadı</Text>
            </View>
          }
        />
      </View>

      {/* Payment Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme'}</Text>
            <TouchableOpacity onPress={savePayment}>
              <Text style={styles.modalSave}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Öğrenci</Text>
              <View style={styles.studentSelector}>
                {students.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[styles.studentOption, formData.student_id === String(student.id) && styles.selectedStudent]}
                    onPress={() => setFormData({ ...formData, student_id: String(student.id), student_name: student.full_name })}
                  >
                    <Text style={[styles.studentOptionText, formData.student_id === String(student.id) && styles.selectedStudentText]}>
                      {student.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama</Text>
              <TextInput
                style={styles.formInput}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Ödeme açıklaması"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tutar (₺)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Vade Tarihi</Text>
              <TextInput
                style={styles.formInput}
                value={formData.due_date}
                onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Durum</Text>
              <View style={styles.statusSelector}>
                {['pending', 'paid', 'overdue'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, formData.status === status && styles.selectedStatus]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.statusOptionText, formData.status === status && styles.selectedStatusText]}>
                      {getStatusText(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={receiptVisible}
        animationType="slide"
        onRequestClose={() => setReceiptVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReceiptVisible(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Makbuz</Text>
            <TouchableOpacity onPress={() => {
              if (selectedPayment) {
                setEditingPayment(selectedPayment);
                setFormData({
                  student_id: String(selectedPayment.student_id || ''),
                  student_name: selectedPayment.student_name || '',
                  description: selectedPayment.description || '',
                  amount: String(selectedPayment.amount || ''),
                  due_date: selectedPayment.due_date || '',
                  status: selectedPayment.status || 'pending',
                });
                setReceiptVisible(false);
                setModalVisible(true);
              }
            }}>
              <Ionicons name="create-outline" size={24} color={colors.brand} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.receiptContainer}>
              <View style={styles.receiptHeader}>
                <Ionicons name="receipt-outline" size={48} color={colors.brand} />
                <Text style={styles.receiptTitle}>Ödeme Makbuzu</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Öğrenci:</Text>
                <Text style={styles.receiptValue}>{selectedPayment?.student_name || '—'}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Açıklama:</Text>
                <Text style={styles.receiptValue}>{selectedPayment?.description || '—'}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tutar:</Text>
                <Text style={[styles.receiptValue, styles.receiptAmount]}>₺{selectedPayment?.amount?.toFixed(2) || '0.00'}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Durum:</Text>
                <View style={[styles.receiptStatusBadge, { backgroundColor: getStatusColor(selectedPayment?.status) + '20' }]}>
                  <Text style={[styles.receiptStatusText, { color: getStatusColor(selectedPayment?.status) }]}>
                    {getStatusText(selectedPayment?.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Vade Tarihi:</Text>
                <Text style={styles.receiptValue}>{selectedPayment?.due_date || '—'}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptDate}>{new Date().toLocaleDateString('tr-TR')}</Text>
                <Text style={styles.receiptId}>#{selectedPayment?.id || '—'}</Text>
              </View>

              <TouchableOpacity style={styles.printButton} onPress={() => alert('Makbuz yazdırılıyor...')}>
                <Ionicons name="print-outline" size={20} color={colors.surface} />
                <Text style={styles.printButtonText}>Yazdır</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareButton} onPress={() => alert('Makbuz paylaşılıyor...')}>
                <Ionicons name="share-outline" size={20} color={colors.brand} />
                <Text style={styles.shareButtonText}>Paylaş</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  headerTitle: {
    fontSize: fontSize.giant,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
  },
  addButton: {
    width: 38,
    height: 38,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: moderateScale(70),
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    height: moderateVerticalScale(44),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: {
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  list: {
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: moderateVerticalScale(80),
    ...shadows.small,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.round,
    marginRight: spacing.md,
  },
  paymentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    lineHeight: moderateVerticalScale(20),
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: moderateVerticalScale(16),
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.text.light,
    marginTop: spacing.xs,
    lineHeight: moderateVerticalScale(14),
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
    lineHeight: moderateVerticalScale(24),
  },
  status: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
    lineHeight: moderateVerticalScale(14),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.muted,
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
  studentSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  studentOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.small,
  },
  selectedStudent: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  studentOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  selectedStudentText: {
    color: colors.surface,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    ...shadows.small,
  },
  selectedStatus: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  selectedStatusText: {
    color: colors.surface,
  },
  receiptContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.small,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  receiptTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.lg,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  receiptLabel: {
    fontSize: fontSize.md,
    color: colors.muted,
  },
  receiptValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  receiptAmount: {
    fontSize: fontSize.xl,
    color: colors.brand,
  },
  receiptStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  receiptStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  receiptDate: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  receiptId: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  printButtonText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareButtonText: {
    color: colors.brand,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },
});
