import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { secureSet, secureGet } from '../lib/secureStorage';
import { BACKEND_URL } from '../lib/config';
import { showErrorAlert, validateForm } from '../utils/errorHandler';
import { Colors } from '../constants/Colors';
import { Toast, GradientButton, GradientCard, ModernInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { getSecurityState, authenticateWithPIN } from '../lib/security';
import { loginWithPasskeyDiscoverable } from '../lib/webauthn';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [securityStatus, setSecurityStatus] = useState({ biometricAvailable: false, biometricEnabled: false, pinEnabled: false });
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [step, setStep] = useState('email');
  const [quickPin, setQuickPin] = useState('');
  const [hasQuickPin, setHasQuickPin] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const status = await getSecurityState();
        setSecurityStatus(status);
        const token = await secureGet('authToken');
        const user = await secureGet('userData');
        setHasStoredSession(!!token && !!user);
        setHasSession(!!token && !!user);
        setHasQuickPin(status.pinEnabled);
      } catch {}
    })();
  }, []);

  // Dev-only auto bypass on web to speed up UI preview
  useEffect(() => {
    if (Platform.OS === 'web' && process.env.NODE_ENV !== 'production') {
      try {
        const params = new URLSearchParams(window.location.search);
        const autoParam = params.get('auto');
        const stored = window.localStorage.getItem('__autoBypass');
        const shouldBypass = autoParam === '1' || stored === '1';
        if (shouldBypass) {
          window.localStorage.setItem('__autoBypass', '1');
          bypassLogin();
        }
      } catch {}
    }
  }, []);

  const isFormValid = useMemo(() => {
    const emailTrimmed = email.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
    return emailValid && password.length > 0;
  }, [email, password]);

  const isEmailValid = useMemo(() => {
    const e = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const handleLogin = async () => {
    // Validate form data
    const validationRules = {
      email: [
        { required: true, label: 'Email' },
        { email: true }
      ],
      password: [
        { required: true, label: 'Password' }
      ]
    };

    const vErrors = validateForm({ email: email.trim(), password }, validationRules);
    if (Object.keys(vErrors).length > 0) {
      const firstError = Object.values(vErrors)[0];
      setErrors(vErrors);
      setToast({ visible: true, message: firstError, type: 'error' });
      return;
    } else {
      setErrors({});
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      // Safe parse: prefer JSON, fallback to text with helpful message
      let data;
      try {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          const hint = response.status === 511
            ? 'Network authentication required by tunnel. Please use a stable HTTPS URL.'
            : response.status === 502
            ? 'Backend service unavailable. Please try again later.'
            : response.status === 404
            ? 'Login endpoint not found. Please check backend configuration.'
            : 'Unexpected response format';
          throw new Error(`${hint} (Status: ${response.status}, Content: ${text.slice(0, 100)})`);
        }
      } catch (parseError) {
        if (parseError.message.includes('Status:')) {
          throw parseError; // Re-throw our custom error
        }
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }

      if (response.ok && data.success) {
        // Store auth data
        await secureSet('authToken', data.token);
        await secureSet('userData', JSON.stringify(data.user));
        
        console.log('[Auth] Token stored length:', data.token?.length);
        console.log('[Auth] User email:', data.user?.email);
        
        // Update auth context
        await checkAuthStatus();
        
        // Show success message
        setToast({ visible: true, message: 'Login successful!', type: 'success' });
        
        // Navigate to dashboard
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }, 1000);
      } else {
        const errorMessage = data.message || data.error || 'Login failed';
        setToast({ visible: true, message: errorMessage, type: 'error' });
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      const errorMessage = error.message || 'Network error. Please check your connection.';
      setToast({ visible: true, message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const e = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!valid) {
      setErrors({ email: 'Enter a valid email' });
      setToast({ visible: true, message: 'Enter a valid email', type: 'error' });
      return;
    }
    setErrors({});
    setStep('password');
  };

  const handleQuickLogin = async () => {
    setQuickLoading(true);
    try {
      const token = await secureGet('authToken');
      const userData = await secureGet('userData');
      
      if (token && userData) {
        await checkAuthStatus();
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        setToast({ visible: true, message: 'Session expired', type: 'error' });
      }
    } catch (error) {
      setToast({ visible: true, message: 'Quick login failed', type: 'error' });
    } finally {
      setQuickLoading(false);
    }
  };

  const handleQuickPinLogin = async () => {
    if (!quickPin) return;
    
    setQuickLoading(true);
    try {
      const success = await authenticateWithPIN(quickPin);
      if (success) {
        await checkAuthStatus();
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        setToast({ visible: true, message: 'Invalid PIN', type: 'error' });
      }
    } catch (error) {
      setToast({ visible: true, message: 'PIN authentication failed', type: 'error' });
    } finally {
      setQuickLoading(false);
    }
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  const navigateToPasswordReset = () => {
    navigation.navigate('PasswordReset');
  };

  // Handle form submission (for web Enter key support)
  const handleFormSubmit = (e) => {
    if (Platform.OS === 'web' && e) {
      e.preventDefault();
    }
    if (isFormValid && !loading) {
      handleLogin();
    }
  };

  // Temporary dev bypass login for testing
  const bypassLogin = async () => {
    try {
      const mockUser = {
        id: 'dev-bypass-user',
        email: 'hasberrydante@gmail.com',
        firstName: 'dante',
        lastName: 'hasberry',
        phoneNumber: null,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      const mockToken = 'dev-bypass-token';

      await secureSet('authToken', mockToken);
      await secureSet('userData', JSON.stringify(mockUser));

      // Refresh AuthContext state from storage
      await checkAuthStatus();

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      console.log('[Bypass] Error:', e);
      showErrorAlert('Bypass Failed', 'Unable to set test login.');
    }
  };

  return (
    <LinearGradient
      colors={[Colors.gradientPrimary, Colors.gradientSecondary, Colors.gradientTertiary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Colors.accent, Colors.accentSecondary]}
                style={styles.logoGradient}
              >
                <Ionicons name="diamond" size={48} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>

          {/* Quick Login Options */}
          {hasSession && (
            <GradientCard variant="accent" padding="medium" style={styles.quickLoginCard}>
              <Text style={styles.quickTitle}>Quick Access</Text>
              <GradientButton
                variant="secondary"
                size="medium"
                onPress={handleQuickLogin}
                loading={quickLoading}
                style={styles.quickButton}
              >
                Continue as Previous User
              </GradientButton>
              {hasQuickPin && (
                <View style={styles.quickPinRow}>
                  <ModernInput
                    variant="minimal"
                    size="medium"
                    placeholder="Enter PIN"
                    value={quickPin}
                    onChangeText={setQuickPin}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    style={styles.quickPinInput}
                  />
                  <GradientButton
                    variant="accent"
                    size="medium"
                    onPress={handleQuickPinLogin}
                    disabled={!quickPin}
                    loading={quickLoading}
                  >
                    PIN
                  </GradientButton>
                </View>
              )}
            </GradientCard>
          )}

          {/* Main Form */}
          <GradientCard variant="glow" padding="large" style={styles.formCard}>
            {step === 'email' ? (
              <View style={styles.emailStep}>
                <Text style={styles.stepTitle}>Enter your email</Text>
                <ModernInput
                  variant="glow"
                  size="large"
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail-outline"
                  error={errors.email}
                />
                <GradientButton
                  variant="primary"
                  size="large"
                  onPress={handleContinue}
                  disabled={loading || !email.trim()}
                  loading={loading}
                  style={styles.continueButton}
                >
                  Continue
                </GradientButton>
              </View>
            ) : (
              <View style={styles.loginStep}>
                <View style={styles.emailSummary}>
                  <Text style={styles.emailSummaryText}>{email}</Text>
                  <TouchableOpacity onPress={() => setStep('email')}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Password Login */}
                <Text style={styles.stepTitle}>Enter your password</Text>
                <ModernInput
                  variant="glow"
                  size="large"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  error={errors.password}
                />
                
                <GradientButton
                  variant="primary"
                  size="large"
                  onPress={handleLogin}
                  disabled={loading || !isFormValid}
                  loading={loading}
                  style={styles.loginButton}
                >
                  Sign In
                </GradientButton>
              </View>
            )}
          </GradientCard>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPassword} 
            onPress={navigateToPasswordReset}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Passkey Login (Web only) */}
          {Platform.OS === 'web' && (
            <View style={styles.passkeySection}>
              <TouchableOpacity
                onPress={async () => {
                  setPasskeyLoading(true);
                  try {
                    const resp = await loginWithPasskeyDiscoverable();
                    if (resp && resp.token && resp.user) {
                      await secureSet('authToken', resp.token);
                      await secureSet('userData', JSON.stringify(resp.user));
                      await checkAuthStatus();
                      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
                    } else {
                      const msg = resp?.error || 'Passkey sign-in failed';
                      setToast({ visible: true, message: msg, type: 'error' });
                    }
                  } catch (e) {
                    setToast({ visible: true, message: String(e.message || e), type: 'error' });
                  } finally {
                    setPasskeyLoading(false);
                  }
                }}
                disabled={passkeyLoading}
                style={styles.passkeyButton}
              >
                <LinearGradient
                  colors={[Colors.accentSecondary, Colors.accent]}
                  style={styles.passkeyGradient}
                >
                  <Ionicons name="finger-print" size={20} color={Colors.white} />
                  <Text style={styles.passkeyText}>
                    {passkeyLoading ? 'Connecting…' : 'Use Passkey'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToSignup}>
              <LinearGradient
                colors={[Colors.accent, Colors.accentSecondary]}
                style={styles.signupGradient}
              >
                <Text style={styles.signupLink}>Sign up</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onAction={() => setToast({ visible: false, message: '', type: 'info' })}
            actionLabel="Dismiss"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Colors.spacing.xl,
    paddingVertical: Colors.spacing.xxl,
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginBottom: Colors.spacing.xxxl,
  },
  logoContainer: {
    marginBottom: Colors.spacing.xl,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: Colors.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadows.glow,
  },
  title: {
    fontSize: Colors.typography.display,
    fontWeight: Colors.typography.weights.extrabold,
    color: Colors.white,
    marginBottom: Colors.spacing.sm,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: Colors.typography.lg,
    fontWeight: Colors.typography.weights.medium,
    color: Colors.textLight,
    textAlign: 'center',
    opacity: 0.9,
  },
  quickLoginCard: {
    marginBottom: Colors.spacing.lg,
  },
  quickTitle: {
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.semibold,
    color: Colors.text,
    marginBottom: Colors.spacing.md,
    textAlign: 'center',
  },
  quickButton: {
    marginBottom: Colors.spacing.md,
  },
  quickPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
  },
  quickPinInput: {
    flex: 1,
  },
  formCard: {
    marginBottom: Colors.spacing.xl,
  },
  emailStep: {
    alignItems: 'stretch',
  },
  loginStep: {
    alignItems: 'stretch',
  },
  stepTitle: {
    fontSize: Colors.typography.xl,
    fontWeight: Colors.typography.weights.semibold,
    color: Colors.text,
    marginBottom: Colors.spacing.lg,
    textAlign: 'center',
  },
  emailSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Colors.spacing.md,
    marginBottom: Colors.spacing.lg,
    paddingHorizontal: Colors.spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Colors.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emailSummaryText: {
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.medium,
    color: Colors.text,
  },
  changeLink: {
    color: Colors.accent,
    fontSize: Colors.typography.sm,
    fontWeight: Colors.typography.weights.semibold,
    paddingHorizontal: Colors.spacing.sm,
    paddingVertical: Colors.spacing.xs,
  },
  continueButton: {
    marginTop: Colors.spacing.lg,
  },
  loginButton: {
    marginTop: Colors.spacing.lg,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: Colors.spacing.lg,
    marginBottom: Colors.spacing.xl,
  },
  forgotPasswordText: {
    color: Colors.accent,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.medium,
    textDecorationLine: 'underline',
  },
  passkeySection: {
    alignItems: 'center',
    marginTop: Colors.spacing.lg,
    marginBottom: Colors.spacing.xl,
  },
  passkeyButton: {
    borderRadius: Colors.borderRadius.lg,
    overflow: 'hidden',
    ...Colors.shadows.medium,
  },
  passkeyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Colors.spacing.md,
    paddingHorizontal: Colors.spacing.lg,
    gap: Colors.spacing.sm,
  },
  passkeyText: {
    color: Colors.white,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Colors.spacing.xl,
  },
  footerText: {
    color: Colors.textLight,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.regular,
  },
  signupGradient: {
    paddingHorizontal: Colors.spacing.md,
    paddingVertical: Colors.spacing.xs,
    borderRadius: Colors.borderRadius.sm,
  },
  signupLink: {
    color: Colors.white,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.semibold,
  },
});

export default LoginScreen;