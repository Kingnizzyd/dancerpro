import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GradientCard } from './UI';

const DateTimePicker = ({ 
  label, 
  value, 
  onChange, 
  mode = 'datetime', // 'date', 'time', or 'datetime'
  minimumDate,
  maximumDate,
  style 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const formatDisplayValue = (date) => {
    if (!date) return 'Select date & time';
    
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (mode === 'date') return dateStr;
    if (mode === 'time') return timeStr;
    return `${dateStr} at ${timeStr}`;
  };

  const handleConfirm = () => {
    setSelectedDate(tempDate);
    onChange(tempDate.toISOString());
    setIsVisible(false);
  };

  const handleCancel = () => {
    setTempDate(selectedDate);
    setIsVisible(false);
  };

  const updateDate = (year, month, day) => {
    const newDate = new Date(tempDate);
    if (year !== undefined) newDate.setFullYear(year);
    if (month !== undefined) newDate.setMonth(month);
    if (day !== undefined) newDate.setDate(day);
    setTempDate(newDate);
  };

  const updateTime = (hours, minutes) => {
    const newDate = new Date(tempDate);
    if (hours !== undefined) newDate.setHours(hours);
    if (minutes !== undefined) newDate.setMinutes(minutes);
    setTempDate(newDate);
  };

  const renderDatePicker = () => {
    const currentYear = tempDate.getFullYear();
    const currentMonth = tempDate.getMonth();
    const currentDay = tempDate.getDate();
    
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <View style={styles.pickerSection}>
        <Text style={styles.pickerSectionTitle}>Date</Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Month</Text>
            <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.pickerItem,
                    index === currentMonth && styles.pickerItemSelected
                  ]}
                  onPress={() => updateDate(undefined, index, undefined)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    index === currentMonth && styles.pickerItemTextSelected
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Day</Text>
            <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerItem,
                    day === currentDay && styles.pickerItemSelected
                  ]}
                  onPress={() => updateDate(undefined, undefined, day)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    day === currentDay && styles.pickerItemTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Year</Text>
            <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    year === currentYear && styles.pickerItemSelected
                  ]}
                  onPress={() => updateDate(year, undefined, undefined)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    year === currentYear && styles.pickerItemTextSelected
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderTimePicker = () => {
    const currentHour = tempDate.getHours();
    const currentMinute = tempDate.getMinutes();
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={styles.pickerSection}>
        <Text style={styles.pickerSectionTitle}>Time</Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Hour</Text>
            <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.pickerItem,
                    hour === currentHour && styles.pickerItemSelected
                  ]}
                  onPress={() => updateTime(hour, undefined)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    hour === currentHour && styles.pickerItemTextSelected
                  ]}>
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Minute</Text>
            <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
              {minutes.filter(m => m % 15 === 0).map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[
                    styles.pickerItem,
                    minute === currentMinute && styles.pickerItemSelected
                  ]}
                  onPress={() => updateTime(undefined, minute)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    minute === currentMinute && styles.pickerItemTextSelected
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const quickOptions = [
      { label: 'Now', date: now },
      { label: 'Today 9:00 AM', date: new Date(today.getTime() + 9 * 60 * 60 * 1000) },
      { label: 'Today 6:00 PM', date: new Date(today.getTime() + 18 * 60 * 60 * 1000) },
      { label: 'Tomorrow 9:00 AM', date: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000) },
    ];

    return (
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Select</Text>
        <View style={styles.quickButtonsRow}>
          {quickOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickButton}
              onPress={() => setTempDate(option.date)}
            >
              <Text style={styles.quickButtonText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={styles.input}
        onPress={() => setIsVisible(true)}
      >
        <View style={styles.inputContent}>
          <Ionicons 
            name={mode === 'time' ? 'time-outline' : 'calendar-outline'} 
            size={20} 
            color={Colors.primary} 
          />
          <Text style={[
            styles.inputText,
            !value && styles.placeholderText
          ]}>
            {formatDisplayValue(value)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <GradientCard variant="glow" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'date' ? 'Select Date' : 
                 mode === 'time' ? 'Select Time' : 
                 'Select Date & Time'}
              </Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {mode !== 'time' && renderQuickActions()}
              {mode !== 'time' && renderDatePicker()}
              {mode !== 'date' && renderTimePicker()}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inputText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  picker: {
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary + '20',
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default DateTimePicker;