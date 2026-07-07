import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../config/theme';
import { getBottomPadding, getTabBarHeight, getResponsiveContainerStyle, responsiveIconSize, useResponsive, moderateScale, moderateVerticalScale } from '../utils/responsive';
import CustomAlert from '../components/CustomAlert';

export default function ClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classFormData, setClassFormData] = useState({
    name: '',
    branch_name: '',
    capacity: 30,
  });
  const [branches, setBranches] = useState([]);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
  });

  // Ensure students is always an array
  const safeStudents = Array.isArray(students) ? students : [];
  const safeAvailableStudents = Array.isArray(availableStudents) ? availableStudents : [];
  const [searchText, setSearchText] = useState('');
  const { tabBarHeight } = useResponsive();
  const bottomPadding = getBottomPadding(tabBarHeight);

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
    fetchClasses();
    fetchBranches();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const data = response.data?.items || response.data || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Classes error:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      const data = response.data?.items || response.data || [];
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Branches error:', error);
      setBranches([]);
    }
  };

  const fetchClassStudents = async (classItem) => {
    try {
      const response = await api.get(`/classes/${classItem.id}/students`);
      const data = response.data?.items || response.data || [];
      setStudents(Array.isArray(data) ? data : []);
      setAvailableStudents([]);
    } catch (error) {
      console.error('Class students error:', error);
      setStudents([]);
      setAvailableStudents([]);
    }
  };

  const openClassDetail = (classItem) => {
    setSelectedClass(classItem);
    fetchClassStudents(classItem);
    setModalVisible(true);
  };

  const assignStudent = async (student) => {
    try {
      await api.post(`/classes/${selectedClass.id}/students`, { student_id: student.id });
      setStudents([...safeStudents, student]);
      setAvailableStudents(safeAvailableStudents.filter(s => s.id !== student.id));
    } catch (error) {
      console.error('Assign student error:', error);
      showAlert('Hata', 'Öğrenci atanamadı', 'error');
    }
  };

  const removeStudent = async (student) => {
    try {
      await api.delete(`/classes/${selectedClass.id}/students/${student.id}`);
      setStudents(safeStudents.filter(s => s.id !== student.id));
      setAvailableStudents([...safeAvailableStudents, student]);
    } catch (error) {
      console.error('Remove student error:', error);
      showAlert('Hata', 'Öğrenci çıkarılamadı', 'error');
    }
  };

  const openEditModal = (classItem = null) => {
    setEditingClass(classItem);
    setClassFormData(classItem || { name: '', branch_name: '', capacity: 30 });
    setEditModalVisible(true);
  };

  const saveClass = async () => {
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, classFormData);
      } else {
        await api.post('/classes', classFormData);
      }
      setEditModalVisible(false);
      fetchClasses();
    } catch (error) {
      console.error('Save class error:', error);
      showAlert('Hata', 'Sınıf kaydedilemedi', 'error');
    }
  };

  const deleteClass = async (classItem) => {
    showAlert(
      'Sınıfı Sil',
      'Bu sınıfı silmek istediğinizden emin misiniz?',
      'danger',
      async () => {
        try {
          await api.delete(`/classes/${classItem.id}`);
          showAlert('Başarılı', 'Sınıf silindi', 'success');
          fetchClasses();
        } catch (error) {
          console.error('Delete class error:', error);
          showAlert('Hata', 'Sınıf silinemedi', 'error');
        }
      },
      true
    );
  };

  const filteredAvailable = safeAvailableStudents.filter(s =>
    s.full_name.toLowerCase().includes(searchText.toLowerCase())
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
          <View>
            <Text style={styles.headerTitle}>Sınıflar</Text>
            <Text style={styles.headerSubtitle}>{classes.length} sınıf</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openEditModal()}
          >
            <Ionicons name="add" size={responsiveIconSize(24)} color={colors.surface} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        >
          {classes.map((classItem) => (
            <TouchableOpacity
              key={classItem.id}
              style={styles.classCard}
              onPress={() => openClassDetail(classItem)}
            >
              <View style={styles.classHeader}>
                <View style={[styles.classIcon, { backgroundColor: '#e6f3ef' }]}>
                  <Ionicons name="people-outline" size={responsiveIconSize(24)} color={colors.brand} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{classItem.name}</Text>
                  <Text style={styles.classBranch}>{classItem.branch_name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={responsiveIconSize(20)} color={colors.muted} />
              </View>
              <View style={styles.classStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{classItem.student_count}</Text>
                  <Text style={styles.statLabel}>Öğrenci</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{classItem.capacity || 30}</Text>
                  <Text style={styles.statLabel}>Kapasite</Text>
                </View>
              </View>
              <View style={styles.classActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(classItem)}
                >
                  <Ionicons name="create-outline" size={responsiveIconSize(20)} color={colors.brand} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => deleteClass(classItem)}
                >
                  <Ionicons name="trash-outline" size={responsiveIconSize(20)} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Class Edit/Create Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={responsiveIconSize(24)} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingClass ? 'Sınıf Düzenle' : 'Yeni Sınıf'}</Text>
            <TouchableOpacity onPress={saveClass}>
              <Text style={styles.modalSave}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Sınıf Adı</Text>
              <TextInput
                style={styles.formInput}
                value={classFormData.name}
                onChangeText={(text) => setClassFormData({ ...classFormData, name: text })}
                placeholder="Örn: 10-A Sınıfı"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Şube</Text>
              <TextInput
                style={styles.formInput}
                value={classFormData.branch_name}
                onChangeText={(text) => setClassFormData({ ...classFormData, branch_name: text })}
                placeholder="Örn: Merkez Şube"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kapasite</Text>
              <TextInput
                style={styles.formInput}
                value={classFormData.capacity?.toString()}
                onChangeText={(text) => setClassFormData({ ...classFormData, capacity: parseInt(text) || 30 })}
                placeholder="30"
                keyboardType="number-pad"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Student Assignment Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={responsiveIconSize(24)} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedClass?.name}</Text>
            <View style={{ width: moderateScale(24) }} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Atanmış Öğrenciler ({safeStudents.length})</Text>
              {safeStudents.length === 0 ? (
                <Text style={styles.emptyText}>Henüz öğrenci atanmamış</Text>
              ) : (
                safeStudents.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={styles.studentItem}
                    onPress={() => removeStudent(student)}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>
                    <Ionicons name="remove-circle-outline" size={responsiveIconSize(24)} color={colors.danger} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Atanabilir Öğrenciler ({filteredAvailable.length})</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Öğrenci ara..."
                value={searchText}
                onChangeText={setSearchText}
              />
              {filteredAvailable.length === 0 ? (
                <Text style={styles.emptyText}>Atanabilir öğrenci yok</Text>
              ) : (
                filteredAvailable.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={styles.studentItem}
                    onPress={() => assignStudent(student)}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={responsiveIconSize(24)} color={colors.brand} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
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
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  headerTitle: {
    fontSize: fontSize.giant,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: 4,
  },
  addButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  classIcon: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  classBranch: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
  classStats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.brand,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  classActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
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
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    ...shadows.small,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  studentEmail: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
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
  modalSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.brand,
  },
});
