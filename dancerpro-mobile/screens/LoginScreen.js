import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { secureSet, secureGet } from '../lib/secureStorage';
import { BACKEND_URL } from '../lib/config';
import { showErrorAlert, showSuccessAlert, handleError, validateForm, ValidationErrors } from '../utils/errorHandler';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/Colors';
import { Toast } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { getSecurityState, authenticateWithBiometrics, authenticateWithPIN } from '../lib/security';
import { createPasskey, loginWithPasskey, loginWithPasskeyDiscoverable } from '../lib/webauthn';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [securityStatus, setSecurityStatus] = useState({ biometricAvailable: false, biometricEnabled: false, pinEnabled: false });
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [pinQuick, setPinQuick] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [phase, setPhase] = useState('email');
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const status = await getSecurityState();
        setSecurityStatus(status);
        const token = await secureGet('authToken');
        const user = await secureGet('userData');
        setHasStoredSession(!!token && !!user);
      } catch {}
    })();
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
            routes: [{ name: 'Dashboard' }],
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

  // Handle form submission (for web Enter key support)
  const handleFormSubmit = (e) => {
    if (Platform.OS === 'web' && e) {
      e.preventDefault();
    }
    if (isFormValid && !loading) {
      handleLogin();
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
    setPhase('password');
  };

  const navigateToSignup = () => {
    navigation.navigate('SignupScreen');
  };

  const navigateToPasswordReset = () => {
    navigation.navigate('PasswordReset');
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

      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      console.log('[Bypass] Error:', e);
      showErrorAlert('Bypass Failed', 'Unable to set test login.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="person-circle" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Quick Login removed for a cleaner experience */}

          {/* Simplified two-step login form */}
          <View style={styles.loginFormContainer}>
            {phase === 'email' ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.inputPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Email address"
                    accessibilityHint="Enter your email"
                    autoComplete="email"
                    returnKeyType="go"
                    onSubmitEditing={handleContinue}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.loginButton, (!isEmailValid || loading) && styles.loginButtonDisabled]}
                  onPress={handleContinue}
                  disabled={loading || !isEmailValid}
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.buttonPrimaryText} size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.emailSummary}>
                  <Text style={styles.emailSummaryText}>{email.trim()}</Text>
                  <TouchableOpacity onPress={() => setPhase('email')} accessibilityRole="button" accessibilityLabel="Change email">
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Password"
                    placeholderTextColor={Colors.inputPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Password"
                    accessibilityHint="Enter your password"
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={showPassword ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.loginButton, (loading || !isFormValid) && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading || !isFormValid}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.buttonPrimaryText} size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPassword} onPress={navigateToPasswordReset} accessibilityRole="button" accessibilityLabel="Forgot your password">
          <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
        </TouchableOpacity>

        {/* Passkey: minimal link for passwordless sign-in (web) */}
        {Platform.OS === 'web' ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={async () => {
                setPasskeyLoading(true);
                try {
                  const resp = await loginWithPasskeyDiscoverable();
                  if (resp && resp.token && resp.user) {
                    await secureSet('authToken', resp.token);
                    await secureSet('userData', JSON.stringify(resp.user));
                    await checkAuthStatus();
                    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
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
              accessibilityRole="button"
              accessibilityLabel="Use passkey"
            >
              <Text style={styles.linkButtonText}>{passkeyLoading ? 'Connecting…' : 'Use passkey'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={navigateToSignup}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Dev bypass removed for cleaner login */}

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onAction={() => setToast({ visible: false, message: '', type: 'info' })}
          actionLabel="Dismiss"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  loginFormContainer: {
    width: '100%',
  },
  emailSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  emailSummaryText: {
    fontSize: 16,
    color: Colors.text,
  },
  changeLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickLoginCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  quickTitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  quickButton: {
    backgroundColor: Colors.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickButtonText: {
    color: Colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  quickPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickPinInput: {
    flex: 1,
  },
  quickPinButton: {
    backgroundColor: Colors.buttonSecondary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickPinButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.inputText,
    paddingVertical: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  loginButton: {
    backgroundColor: Colors.buttonPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  passkeySection: {
    display: 'none',
  },
  linkButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  passkeyHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  bypassButton: { display: 'none' },
  bypassButtonText: { display: 'none' },
  loginButtonText: {
    color: Colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});

export default LoginScreen;