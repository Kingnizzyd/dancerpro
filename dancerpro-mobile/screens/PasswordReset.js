import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const onSubmit = () => {
    // Placeholder: integrate real reset flow later
    if (!email) {
      setStatus('Please enter your email');
    } else {
      setStatus('If the account exists, a reset link was sent.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button title="Send reset link" onPress={onSubmit} />
      {!!status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 12 },
  status: { marginTop: 10, color: '#555' },
});