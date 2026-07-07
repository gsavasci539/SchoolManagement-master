import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import useAuthStore from '../store/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../config/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre alanları zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // 1. ADIM: Sunucudan gelen ham veriyi kontrol edelim
      if (!response.data) {
        Alert.alert('Giriş Hatası', 'Sunucudan boş veri döndü.');
        setLoading(false);
        return;
      }

      // === DEĞİŞİKLİK BURADA YAPILDI: response.data yerine response.data.data kullanıldı ===
      const { access_token, refresh_token, user } = response.data.data || {};

      // 2. ADIM: Anahtarlar uyuşuyor mu veya sunucu 200 içinde hata mı döndü?
      if (!access_token) {
        Alert.alert(
          'Sunucu Veri Yapısı Uyuşmazlığı',
          `Sunucudan 200 yanıtı geldi fakat 'access_token' bulunamadı.\n\nSunucudan Dönen Tüm Veri:\n${JSON.stringify(response.data)}`
        );
        setLoading(false);
        return;
      }

      // Her şey doğruysa giriş yap ve yönlendir
      login(user, access_token, refresh_token);

    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMsg = 'Giriş başarısız';
      if (error.response) {
        errorMsg = `Hata Kodu: ${error.response.status}\nDetay: ${error.response.data?.detail || JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMsg = 'Sunucuya ulaşılamadı. Ağ hatası veya CORS problemi devam ediyor.';
      } else {
        errorMsg = error.message;
      }
      
      Alert.alert('Giriş Hatası', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Alert.prompt(
      'Şifremi Unuttum',
      'E-posta adresinizi girin',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async (email) => {
            if (!email) {
              Alert.alert('Hata', 'E-posta adresi zorunludur');
              return;
            }
            try {
              await api.post('/auth/forgot-password', { email });
              Alert.alert('Başarılı', 'Şifre sıfırlama linki e-posta adresinize gönderildi');
            } catch (error) {
              console.error('Forgot password error:', error);
              Alert.alert('Hata', 'İşlem başarısız');
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.loginPanel}>
          <View style={styles.loginBrand}>
            <View style={styles.brandMark}>
              <Ionicons name="school" size={23} color={colors.navy} />
            </View>
            <View>
              <Text style={styles.brandTitle}>Okul360</Text>
              <Text style={styles.brandSubtitle}>Yönetim Merkezi</Text>
            </View>
          </View>

          <Text style={styles.loginTitle}>Giriş Yap</Text>
          <Text style={styles.loginLead}>
            Okul yönetim sisteminize erişmek için kimlik bilgilerinizi girin.
          </Text>

          <View style={styles.loginForm}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-posta adresiniz"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifreniz"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loginPanel: {
    width: '100%',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  loginBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: fontSize.huge,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    marginTop: 5,
    color: colors.text.light,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  loginTitle: {
    fontSize: fontSize.colossal,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
    letterSpacing: -1.2,
    marginBottom: spacing.md,
  },
  loginLead: {
    color: colors.muted,
    fontSize: fontSize.lg,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  loginForm: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  passwordToggle: {
    padding: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginButtonDisabled: {
    backgroundColor: colors.line,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotText: {
    color: colors.brand,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});