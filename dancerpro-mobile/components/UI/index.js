import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';

// Tag Component
export const Tag = ({ children, style, ...props }) => (
  <View style={[styles.tag, style]} {...props}>
    <Text style={styles.tagText}>{children}</Text>
  </View>
);

// Button Component
export const Button = ({ title, onPress, style, disabled, ...props }) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.buttonDisabled, style]}
    onPress={onPress}
    disabled={disabled}
    {...props}
  >
    <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
      {title}
    </Text>
  </TouchableOpacity>
);

// Input Component
export const Input = ({ placeholder, value, onChangeText, style, ...props }) => (
  <TextInput
    style={[styles.input, style]}
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    {...props}
  />
);

// Card Component
export const Card = ({ children, style, ...props }) => (
  <View style={[styles.card, style]} {...props}>
    {children}
  </View>
);

// Toast Component (using Alert for simplicity)
export const Toast = {
  show: (message, type = 'info') => {
    Alert.alert(type === 'error' ? 'Error' : 'Info', message);
  }
};

// Segmented Component
export const Segmented = ({ options, selectedIndex, onSelectionChange, style }) => (
  <View style={[styles.segmented, style]}>
    {options.map((option, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.segmentedOption,
          selectedIndex === index && styles.segmentedOptionSelected
        ]}
        onPress={() => onSelectionChange(index)}
      >
        <Text
          style={[
            styles.segmentedText,
            selectedIndex === index && styles.segmentedTextSelected
          ]}
        >
          {option}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedOptionSelected: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 14,
    color: '#666',
  },
  segmentedTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
});