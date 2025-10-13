import React, { useState, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { secureSet } from '../lib/secureStorage';
import { BACKEND_URL } from '../lib/config';
import { Colors } from '../constants/Colors';
import { Toast } from '../components/UI';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const passwordScore = useMemo(() => {
    const p = formData.password || '';
    let score = 0;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return score; // 0–5
  }, [formData.password]);

  const isFormValid = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((formData.email || '').trim());
    const nameValid = (formData.name || '').trim().length >= 2;
    const passValid = passwordScore >= 4;
    const matchValid = formData.password === formData.confirmPassword && (formData.password || '').length > 0;
    return emailValid && nameValid && passValid && matchValid;
  }, [formData.email, formData.name, passwordScore, formData.password, formData.confirmPassword]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear field-specific error as user types
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;
    const nextErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      nextErrors.name = 'Please enter your name';
    } else if (name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      nextErrors.email = 'Please enter your email';
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Please enter a password';
    } else if (passwordScore < 4) {
      nextErrors.password = 'Password must meet complexity requirements';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstMessage = nextErrors.name || nextErrors.email || nextErrors.password || nextErrors.confirmPassword;
      setToast({ visible: true, message: firstMessage, type: 'error' });
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    console.log('🔥 CREATE BUTTON PRESSED - handleSignup called');
    console.log('🔍 Current BACKEND_URL:', BACKEND_URL);
    
    if (loading) {
      console.log('⚠️ Already loading, ignoring press');
      return;
    }

    console.log('📝 Form data:', { 
      name: formData.name, 
      email: formData.email, 
      hasPassword: !!formData.password,
      hasConfirmPassword: !!formData.confirmPassword
    });

    // Validation with inline errors + toast
    const valid = validateForm();
    if (!valid) {
      console.log('❌ Validation failed via validateForm');
      return;
    }

    console.log('✅ Validation passed, starting signup...');
    setLoading(true);

    try {
      // Split name into first and last name
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const signupData = {
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        // Include multiple confirmation keys to satisfy different backend variants
        passwordConfirmation: formData.password,
        passwordConfirm: formData.password,
        password_confirmation: formData.password,
      };

      const requestUrl = `${BACKEND_URL}/auth-register`;
      console.log('🌐 Making request to:', requestUrl);
      console.log('📤 Signup data:', { ...signupData, password: '[HIDDEN]', passwordConfirmation: '[HIDDEN]' });

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      const headersObj = Object.fromEntries(response.headers.entries());
      console.log('📥 Response headers:', headersObj);

      // Safely parse response. If not JSON, read text and surface a helpful message.
      let data;
      const contentType = headersObj['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseErr) {
          console.log('⚠️ JSON parse failed, falling back to text:', parseErr?.message);
          const text = await response.text();
          data = { success: false, message: text?.slice(0, 200) || 'Unexpected non-JSON response' };
        }
      } else {
        const text = await response.text();
        // Detect common HTML error (e.g., 511 captive portal / tunnel page)
        const isHtml = (text || '').trim().startsWith('<');
        const hint = response.status === 511
          ? 'Network authentication required by tunnel. Please use a stable HTTPS URL (ngrok/cloudflared) or update backendUrl.'
          : 'Server returned non-JSON response.';
        data = { success: false, message: `${hint} (${contentType || 'unknown content-type'}) | ${String(text).slice(0, 200)}` };
      }
      console.log('📥 Parsed response data:', data);

      if (response.ok) {
        console.log('🎉 Signup successful!');
        // Store tokens
        await secureSet('authToken', data.token);
        if (data.refreshToken) {
          await secureSet('refreshToken', data.refreshToken);
        }
        await secureSet('userData', JSON.stringify(data.user));
        setToast({ visible: true, message: 'Account created successfully!', type: 'success' });
        navigation.navigate('Dashboard');
      } else {
        console.log('❌ Signup failed:', data.message || data.error);
        setToast({ visible: true, message: data.message || data.error || 'Registration failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.log('💥 Network/Parse error:', error);
      console.log('💥 Error details:', error.message, error.stack);
      setToast({ visible: true, message: `Unable to connect: ${error.message}`, type: 'error' });
    } finally {
      console.log('🏁 Signup process completed, setting loading to false');
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('LoginScreen');
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
            <Ionicons name="person-add-outline" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your journey</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.inputPlaceholder}
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Full name"
              accessibilityHint="Enter your full name"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.inputPlaceholder}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={Colors.inputPlaceholder}
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Password"
              accessibilityHint="Create a strong password"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={showPassword ? Colors.primary : Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.passwordStrengthRow}>
              <View style={[styles.strengthBar, passwordScore >= 1 ? styles.strengthBarOn : null]} />
              <View style={[styles.strengthBar, passwordScore >= 2 ? styles.strengthBarOn : null]} />
              <View style={[styles.strengthBar, passwordScore >= 3 ? styles.strengthBarOn : null]} />
              <View style={[styles.strengthBar, passwordScore >= 4 ? styles.strengthBarOn : null]} />
              <View style={[styles.strengthBar, passwordScore >= 5 ? styles.strengthBarOn : null]} />
              <Text style={styles.strengthLabel}>{passwordScore <= 2 ? 'Weak' : passwordScore === 3 ? 'Okay' : passwordScore === 4 ? 'Strong' : 'Very strong'}</Text>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm password"
              placeholderTextColor={Colors.inputPlaceholder}
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Confirm password"
              accessibilityHint="Re-enter your password"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={showConfirmPassword ? Colors.primary : Colors.textSecondary} />
            </TouchableOpacity>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Password Requirements */}
          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementText}>
              Use 12+ chars, mix upper/lowercase, number, and symbol.
            </Text>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, (loading || !isFormValid) && styles.signupButtonDisabled]}
            onPress={() => {
              console.log('🖱️ BUTTON PHYSICALLY PRESSED - About to call handleSignup');
              handleSignup();
            }}
            disabled={loading || !isFormValid}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {loading ? (
              <ActivityIndicator color={Colors.buttonPrimaryText} size="small" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Sign in</Text>
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
    position: 'relative',
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
  passwordRequirements: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  requirementText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  signupButton: {
    backgroundColor: Colors.buttonPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: Colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '700',
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
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordStrengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  strengthBar: {
    width: 20,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
    backgroundColor: Colors.border,
  },
  strengthBarOn: {
    backgroundColor: Colors.success,
  },
  strengthLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    position: 'absolute',
    bottom: -18,
    left: 16,
    color: Colors.error,
    fontSize: 12,
  },
});

export default SignupScreen;