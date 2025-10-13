import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { getAllDataSnapshot, importAllDataSnapshot } from '../lib/db';
import { pushToCloud, restoreFromCloud, getSyncStatus } from '../lib/syncService';
import {
  initializeSecurity,
  authenticateWithBiometrics,
  setPIN,
  authenticateWithPIN,
  enableBiometric,
  disableBiometric,
  removePIN,
  getSecurityState,
  triggerQuickExit,
  enableQuickExit
} from '../lib/security';

export default function SecuritySettings() {
  const [securityStatus, setSecurityStatus] = useState({
    biometricAvailable: false,
    biometricEnabled: false,
    pinEnabled: false,
    isLocked: false
  });
  const [loading, setLoading] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [quickExitEnabled, setQuickExitEnabled] = useState(false);
  const { logout } = useAuth();
  const [cloudStatus, setCloudStatus] = useState({ exists: false, metadata: null, size: 0 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSecurityStatus();
    enableQuickExit(); // Enable quick exit gesture detection
    loadCloudStatus();
  }, []);

  const loadSecurityStatus = async () => {
    setLoading(true);
    try {
      const status = await initializeSecurity();
      setSecurityStatus(status);
    } catch (error) {
      console.warn('Failed to load security status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCloudStatus = async () => {
    try {
      const status = await getSyncStatus();
      setCloudStatus(status || { exists: false });
    } catch (e) {
      console.warn('Failed to load cloud status:', e);
    }
  };

  const handleCloudSync = async () => {
    try {
      setSyncing(true);
      const snapshot = await getAllDataSnapshot();
      await pushToCloud(snapshot);
      await loadCloudStatus();
      Alert.alert('Sync Complete', 'Your data has been synced to cloud.');
    } catch (e) {
      Alert.alert('Sync Failed', e?.message || 'Could not sync to cloud.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    try {
      setSyncing(true);
      const { snapshot } = await restoreFromCloud();
      if (!snapshot) {
        Alert.alert('No Cloud Backup', 'No cloud snapshot found to restore.');
        return;
      }
      await importAllDataSnapshot(snapshot);
      Alert.alert('Restore Complete', 'Your local data has been restored.');
    } catch (e) {
      Alert.alert('Restore Failed', e?.message || 'Could not restore from cloud.');
    } finally {
      setSyncing(false);
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      // Test biometric authentication before enabling
      const result = await authenticateWithBiometrics({
        promptMessage: 'Authenticate to enable biometric login'
      });
      
      if (result.success) {
        const enableResult = await enableBiometric();
        if (enableResult.success) {
          setSecurityStatus(prev => ({ ...prev, biometricEnabled: true }));
          Alert.alert('Success', 'Biometric authentication enabled');
        } else {
          Alert.alert('Error', enableResult.error);
        }
      } else {
        Alert.alert('Authentication Failed', result.message || 'Could not authenticate');
      }
    } else {
      Alert.alert(
        'Disable Biometric',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
              setSecurityStatus(prev => ({ ...prev, biometricEnabled: false }));
            }
          }
        ]
      );
    }
  };

  const handlePinSetup = async () => {
    if (pinInput.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits');
      return;
    }

    if (pinInput !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }

    const result = await setPIN(pinInput);
    if (result.success) {
      setSecurityStatus(prev => ({ ...prev, pinEnabled: true }));
      setShowPinSetup(false);
      setPinInput('');
      setConfirmPin('');
      Alert.alert('Success', 'PIN set successfully');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your PIN? This will disable PIN authentication.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removePIN();
            setSecurityStatus(prev => ({ ...prev, pinEnabled: false }));
            Alert.alert('Success', 'PIN removed');
          }
        }
      ]
    );
  };

  const testBiometric = async () => {
    const result = await authenticateWithBiometrics({
      promptMessage: 'Test biometric authentication'
    });
    
    if (result.success) {
      Alert.alert('Success', 'Biometric authentication successful!');
    } else {
      Alert.alert('Failed', result.message || 'Authentication failed');
    }
  };

  const testQuickExit = () => {
    Alert.alert(
      'Quick Exit Test',
      'This feature allows you to quickly exit the app in emergency situations. In a real scenario, you would shake your device or use a gesture.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Test Exit', onPress: triggerQuickExit }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading security settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
        <Text style={styles.title}>Security Settings</Text>
        <Text style={styles.subtitle}>Protect your sensitive data</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            try {
              await logout();
              Alert.alert('Logged out', 'Your session has been cleared.');
            } catch (e) {}
          }}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.buttonPrimaryText} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Biometric Authentication */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="finger-print" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Biometric Authentication</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint / Face Unlock'}
            </Text>
            <Text style={styles.settingDescription}>
              {securityStatus.biometricAvailable 
                ? 'Use biometrics to unlock the app quickly and securely'
                : 'Biometric authentication not available on this device'
              }
            </Text>
          </View>
          <Switch
            value={securityStatus.biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!securityStatus.biometricAvailable}
            trackColor={{ false: Colors.inputBackground, true: Colors.primary }}
            thumbColor={securityStatus.biometricEnabled ? Colors.buttonPrimaryText : Colors.textSecondary}
            accessibilityLabel="Enable biometric authentication"
          />
        </View>

        {securityStatus.biometricEnabled && (
          <TouchableOpacity style={styles.testButton} onPress={testBiometric} accessibilityRole="button" accessibilityLabel="Test biometric authentication">
            <Text style={styles.testButtonText}>Test Biometric Authentication</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cloud Sync */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-upload" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Cloud Sync</Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons name={cloudStatus.exists ? 'checkmark-circle' : 'close-circle'} size={18} color={cloudStatus.exists ? Colors.success : Colors.error} />
            <Text style={styles.statusText}>
              {cloudStatus.exists ? `Cloud backup exists (updated ${cloudStatus?.metadata?.updatedAt || 'N/A'})` : 'No cloud backup available'}
            </Text>
          </View>
          {cloudStatus.exists && (
            <View style={styles.statusItem}>
              <Ionicons name="document-text" size={18} color={Colors.textSecondary} />
              <Text style={styles.statusText}>Approx size: {Math.round((cloudStatus.size || 0) / 1024)} KB</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.actionButton, syncing && styles.cancelButton]}
            onPress={handleCloudSync}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Sync Now"
          >
            <Ionicons name="refresh" size={18} color={Colors.buttonPrimaryText} />
            <Text style={styles.actionButtonText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleRestoreFromCloud}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Restore from Cloud"
          >
            <Ionicons name="cloud-download" size={18} color={Colors.buttonPrimaryText} />
            <Text style={styles.actionButtonText}>Restore from Cloud</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipText}>
            Sync uploads a snapshot of your local data to the cloud. Restore replaces local data with the last cloud snapshot.
          </Text>
        </View>
      </View>

      {/* PIN Authentication */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="keypad" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>PIN Authentication</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>4-Digit PIN</Text>
            <Text style={styles.settingDescription}>
              {securityStatus.pinEnabled 
                ? 'PIN is currently set and active'
                : 'Set a 4-digit PIN as backup authentication'
              }
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, securityStatus.pinEnabled && styles.dangerButton]}
            onPress={securityStatus.pinEnabled ? handleRemovePin : () => setShowPinSetup(true)}
          >
            <Text style={styles.actionButtonText}>
              {securityStatus.pinEnabled ? 'Remove' : 'Set PIN'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPinSetup && (
          <View style={styles.pinSetupContainer}>
            <Text style={styles.pinSetupTitle}>Set Your 4-Digit PIN</Text>
            
            <View style={styles.pinInputContainer}>
              <Text style={styles.pinInputLabel}>Enter PIN:</Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                placeholder="••••"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.pinInputContainer}>
              <Text style={styles.pinInputLabel}>Confirm PIN:</Text>
              <TextInput
                style={styles.pinInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                placeholder="••••"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.pinSetupActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowPinSetup(false);
                  setPinInput('');
                  setConfirmPin('');
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handlePinSetup}
              >
                <Text style={styles.actionButtonText}>Set PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Quick Exit */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="exit" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Quick Exit</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Emergency Exit</Text>
            <Text style={styles.settingDescription}>
              Quickly exit the app in emergency situations (shake device or gesture)
            </Text>
          </View>
          <Switch
            value={quickExitEnabled}
            onValueChange={setQuickExitEnabled}
            trackColor={{ false: Colors.inputBackground, true: Colors.primary }}
            thumbColor={quickExitEnabled ? Colors.buttonPrimaryText : Colors.textSecondary}
            accessibilityLabel="Enable quick exit"
          />
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testQuickExit}>
          <Text style={styles.testButtonText}>Test Quick Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Security Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Security Status</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons 
              name={securityStatus.biometricEnabled ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={securityStatus.biometricEnabled ? Colors.success : Colors.textSecondary} 
            />
            <Text style={styles.statusText}>Biometric Authentication</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons 
              name={securityStatus.pinEnabled ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={securityStatus.pinEnabled ? Colors.success : Colors.textSecondary} 
            />
            <Text style={styles.statusText}>PIN Protection</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons 
              name={quickExitEnabled ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={quickExitEnabled ? Colors.success : Colors.textSecondary} 
            />
            <Text style={styles.statusText}>Quick Exit</Text>
          </View>
        </View>
      </View>

      {/* Security Tips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Security Tips</Text>
        </View>
        
        <View style={styles.tipsContainer}>
          <Text style={styles.tipText}>• Enable both biometric and PIN for maximum security</Text>
          <Text style={styles.tipText}>• Use a unique PIN that's not easily guessed</Text>
          <Text style={styles.tipText}>• Quick exit helps protect your privacy in emergencies</Text>
          <Text style={styles.tipText}>• Your data is encrypted and stored securely on device</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerButton: {
    backgroundColor: Colors.error,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceSecondary,
  },
  actionButtonText: {
    color: Colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  testButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  pinSetupContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  pinSetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  pinInputContainer: {
    marginBottom: 16,
  },
  pinInputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: Colors.inputBackground,
    color: Colors.inputText,
    fontSize: 18,
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    letterSpacing: 8,
  },
  pinSetupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusContainer: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tipsContainer: {
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.buttonPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: Colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '600',
  },
});