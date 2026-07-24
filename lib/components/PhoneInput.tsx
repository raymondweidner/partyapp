import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { AsYouType, CountryCode, parsePhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { colors, globalStyles } from '../theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  defaultCountry?: CountryCode;
}

export default function PhoneInput({ value, onChangeText, defaultCountry = 'US' }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountry);
  const [formattedValue, setFormattedValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Parse initial value (which is in E.164 format from server)
  useEffect(() => {
    if (value) {
      try {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber) {
          if (phoneNumber.country) {
            setCountryCode(phoneNumber.country);
          }
          // Display in national format (e.g. (213) 373-4253)
          setFormattedValue(phoneNumber.formatNational());
        } else {
          setFormattedValue(value);
        }
      } catch (e) {
        // Fallback if it can't parse
        setFormattedValue(value);
      }
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    const formatter = new AsYouType(countryCode);
    const formatted = formatter.input(text);
    setFormattedValue(formatted);

    const phoneNumber = formatter.getNumber();
    if (phoneNumber && phoneNumber.isValid()) {
      onChangeText(phoneNumber.number.toString());
    } else {
      // Pass partially constructed E164 or empty
      const rawDigits = formatted.replace(/\D/g, '');
      if (rawDigits.length > 0) {
        onChangeText(`+${getCountryCallingCode(countryCode)}${rawDigits}`);
      } else {
        onChangeText('');
      }
    }
  };

  const countries = useMemo(() => {
    return getCountries().map(code => ({
      code,
      callingCode: getCountryCallingCode(code),
    })).sort((a, b) => a.code.localeCompare(b.code));
  }, []);

  const selectCountry = (code: CountryCode) => {
    setCountryCode(code);
    setShowPicker(false);
    // Re-format existing input if any
    const rawDigits = formattedValue.replace(/\D/g, '');
    if (rawDigits.length > 0) {
      const formatter = new AsYouType(code);
      const newFormatted = formatter.input(rawDigits);
      setFormattedValue(newFormatted);
      
      const phoneNumber = formatter.getNumber();
      if (phoneNumber && phoneNumber.isValid()) {
        onChangeText(phoneNumber.number.toString());
      } else {
        onChangeText(`+${getCountryCallingCode(code)}${rawDigits}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.countrySelector} 
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.countryCodeText}>
          {countryCode} (+{getCountryCallingCode(countryCode)}) ▾
        </Text>
      </TouchableOpacity>
      
      <TextInput
        style={[globalStyles.input, styles.inputOverride]}
        value={formattedValue}
        onChangeText={handleChangeText}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        placeholderTextColor={colors.textMuted}
      />

      <Modal visible={showPicker} animationType="slide" transparent={true}>
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, styles.pickerContent]}>
            <View style={styles.pickerHeader}>
              <Text style={globalStyles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.countryItem}
                  onPress={() => selectCountry(item.code)}
                >
                  <Text style={styles.countryItemText}>{item.code}</Text>
                  <Text style={styles.callingCodeText}>+{item.callingCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24, // match globalStyles.formGroup
  },
  countrySelector: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0,
  },
  countryCodeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  inputOverride: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginBottom: 0,
    height: 48,
  },
  pickerContent: {
    height: '80%',
    width: '90%',
    padding: 0,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  countryItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  callingCodeText: {
    color: colors.textSecondary,
    fontSize: 16,
  }
});
