import React, { useState, useEffect } from 'react';
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
import { seedMockDataForUser } from '../lib/mockData';
import { openDb, importAllDataSnapshot } from '../lib/db';
import { BACKEND_URL } from '../lib/config';
import { Colors } from '../constants/Colors';
import { Toast, GradientButton, GradientCard } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const { checkAuthStatus } = useAuth();

  // Test accounts data
  const testAccounts = [
    {
      id: '1',
      email: 'user1@test.com',
      name: 'Test User 1',
      role: 'admin',
      avatar: '👤',
      description: 'Admin Test Account'
    },
    {
      id: '2',
      email: 'user2@test.com',
      name: 'Test User 2',
      role: 'user',
      avatar: '👥',
      description: 'User Test Account'
    },
    {
      id: '3',
      email: 'user3@test.com',
      name: 'Test User 3',
      role: 'user',
      avatar: '👤',
      description: 'Unique Tester Account'
    }
  ];

  useEffect(() => {
    (async () => {
      try {
        const token = await secureGet('authToken');
        const user = await secureGet('userData');
        setHasStoredSession(!!token && !!user);
      } catch {}
    })();
  }, []);

  const handleTestAccountLogin = async (account) => {
    setLoading(true);

    try {
      // Generate a mock JWT token for test accounts (no backend call needed)
      const mockToken = `test-token-${account.id}-${Date.now()}`;
      
      // Create user data for the test account
      const userData = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        isTestAccount: true
      };
      
      // Store auth data directly without backend authentication
      await secureSet('authToken', mockToken);
      await secureSet('userData', JSON.stringify(userData));
      
      if (String(account.id) === '1') {
        // Seed comprehensive mock data for primary test profile (User 1)
        await seedMockDataForUser('1', {
          clients: 24,
          venues: 5,
          outfits: 10,
          transactions: 120,
          shifts: 120,
          months: 6,
        });
        // Prevent duplicate dashboard auto-seeding
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.setItem('mockSeedUser1', 'true'); } catch {}
        }
      } else {
        // Keep secondary test profile (User 2) empty for fresh manual inputs
        const db = openDb();
        await importAllDataSnapshot(db, {
          venues: [],
          shifts: [],
          transactions: [],
          clients: [],
          outfits: [],
          events: [],
        });
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.removeItem(`mockSeedUser${account.id}`); } catch {}
        }
      }
      
      console.log('[Auth] Test account login successful (no authentication required):', account.email);
      
      // Update auth context
      await checkAuthStatus();
      
      // Show success message
      setToast({ visible: true, message: `Welcome ${account.name}!`, type: 'success' });
      
      // Navigate to dashboard
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 1000);
      
    } catch (error) {
      console.error('[Auth] Test account login error:', error);
      setToast({ visible: true, message: 'Login failed. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.subtitle}>Select a test account to continue</Text>
          </View>

          {/* Quick Login Options */}
          {hasStoredSession && (
            <GradientCard variant="accent" padding="medium" style={styles.quickLoginCard}>
              <Text style={styles.quickTitle}>Quick Access</Text>
              <GradientButton
                variant="secondary"
                size="medium"
                onPress={handleQuickLogin}
                loading={quickLoading}
                style={styles.quickButton}
              >
                <View style={styles.quickButtonContent}>
                  <Ionicons name="flash" size={20} color={Colors.white} />
                  <Text style={styles.quickButtonText}>Continue Previous Session</Text>
                </View>
              </GradientButton>
            </GradientCard>
          )}

          {/* Test Accounts Selection */}
          <GradientCard variant="primary" padding="large" style={styles.formCard}>
            <Text style={styles.sectionTitle}>Test Accounts</Text>
            <Text style={styles.sectionSubtitle}>Choose an account for testing</Text>
            
            {testAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountCard}
                onPress={() => handleTestAccountLogin(account)}
                disabled={loading}
              >
                <LinearGradient
                  colors={account.role === 'admin' 
                    ? [Colors.accent, Colors.accentSecondary] 
                    : [Colors.primary, Colors.primarySecondary]
                  }
                  style={styles.accountGradient}
                >
                  <View style={styles.accountContent}>
                    <View style={styles.accountAvatar}>
                      <Text style={styles.avatarText}>{account.avatar}</Text>
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountEmail}>{account.email}</Text>
                      <Text style={styles.accountRole}>{account.description}</Text>
                    </View>
                    <View style={styles.accountAction}>
                      {loading ? (
                        <Ionicons name="hourglass" size={24} color={Colors.white} />
                      ) : (
                        <Ionicons name="arrow-forward" size={24} color={Colors.white} />
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </GradientCard>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Testing Environment</Text>
            <Text style={styles.footerSubtext}>No password required for test accounts</Text>
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
  quickButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.sm,
  },
  quickButtonText: {
    color: Colors.white,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.semibold,
  },
  formCard: {
    marginBottom: Colors.spacing.xl,
  },
  sectionTitle: {
    fontSize: Colors.typography.xl,
    fontWeight: Colors.typography.weights.bold,
    color: Colors.text,
    marginBottom: Colors.spacing.sm,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.medium,
    color: Colors.textSecondary,
    marginBottom: Colors.spacing.lg,
    textAlign: 'center',
  },
  accountCard: {
    marginBottom: Colors.spacing.md,
    borderRadius: Colors.borderRadius.lg,
    overflow: 'hidden',
    ...Colors.shadows.medium,
  },
  accountGradient: {
    padding: Colors.spacing.lg,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: Colors.borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Colors.spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: Colors.typography.lg,
    fontWeight: Colors.typography.weights.bold,
    color: Colors.white,
    marginBottom: Colors.spacing.xs,
  },
  accountEmail: {
    fontSize: Colors.typography.sm,
    fontWeight: Colors.typography.weights.medium,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Colors.spacing.xs,
  },
  accountRole: {
    fontSize: Colors.typography.xs,
    fontWeight: Colors.typography.weights.medium,
    color: Colors.white,
    opacity: 0.7,
  },
  accountAction: {
    marginLeft: Colors.spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: Colors.spacing.xl,
  },
  footerText: {
    color: Colors.textLight,
    fontSize: Colors.typography.md,
    fontWeight: Colors.typography.weights.semibold,
    marginBottom: Colors.spacing.xs,
  },
  footerSubtext: {
    color: Colors.textLight,
    fontSize: Colors.typography.sm,
    fontWeight: Colors.typography.weights.regular,
    opacity: 0.7,
  },
});

export default LoginScreen;