import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AIInsights() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Insights</Text>
      <Text style={styles.text}>This is a placeholder screen for AI features.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  text: { color: '#555' },
});