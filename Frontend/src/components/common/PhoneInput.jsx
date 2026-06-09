import React, { useMemo } from 'react';
import { Input, Select, Space } from 'antd';
import { useGetCountryCodesQuery } from '../../store/api/apiSlice';

// Fallback list used while country codes are loading
const DEFAULT_COUNTRIES = [
  { code: 'IN', name: 'India',        dialCode: '+91', flag: '🇮🇳', minLength: 10, maxLength: 10 },
  { code: 'US', name: 'USA',          dialCode: '+1',  flag: '🇺🇸', minLength: 10, maxLength: 10 },
  { code: 'GB', name: 'UK',           dialCode: '+44', flag: '🇬🇧', minLength: 10, maxLength: 11 },
  { code: 'AE', name: 'UAE',          dialCode: '+971',flag: '🇦🇪', minLength: 9,  maxLength: 9  },
  { code: 'SG', name: 'Singapore',    dialCode: '+65', flag: '🇸🇬', minLength: 8,  maxLength: 8  },
  { code: 'AU', name: 'Australia',    dialCode: '+61', flag: '🇦🇺', minLength: 9,  maxLength: 9  },
];

// Parse a stored value like "+919876543210" back into { dialCode, number }
function parsePhoneValue(value, countries) {
  if (!value) return { dialCode: '+91', number: '' };
  if (!value.startsWith('+')) return { dialCode: '+91', number: value };
  // Sort by dialCode length descending to avoid prefix conflicts (+1 vs +1829)
  const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = sorted.find((c) => value.startsWith(c.dialCode));
  if (match) return { dialCode: match.dialCode, number: value.slice(match.dialCode.length) };
  return { dialCode: '+91', number: value };
}

/**
 * PhoneInput — drop-in replacement for <Input> inside <Form.Item>.
 * Renders a country-code Select + number Input.
 * Stores the combined value as "+<dialCode><digits>" in the form field.
 *
 * Props passed automatically by Form.Item: value, onChange
 * Extra props:  placeholder, style, disabled, size
 */
const PhoneInput = ({ value = '', onChange, placeholder = 'Phone number', style, disabled, size }) => {
  const { data: ccData } = useGetCountryCodesQuery();
  const countries = ccData?.data || DEFAULT_COUNTRIES;

  const { dialCode, number } = useMemo(
    () => parsePhoneValue(value, countries),
    [value, countries],
  );

  const handleDialCodeChange = (dc) => {
    onChange?.(dc + number);
  };

  const handleNumberChange = (e) => {
    // Allow digits only
    const num = e.target.value.replace(/\D/g, '');
    onChange?.(dialCode + num);
  };

  // Find selected country for display
  const selected = countries.find((c) => c.dialCode === dialCode) || DEFAULT_COUNTRIES[0];

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <Select
        value={dialCode}
        onChange={handleDialCodeChange}
        disabled={disabled}
        showSearch
        optionFilterProp="label"
        style={{ width: 105, flexShrink: 0 }}
        size={size}
        dropdownStyle={{ minWidth: 260 }}
        options={countries.map((c) => ({
          value: c.dialCode,
          label: `${c.flag} ${c.dialCode}`,
          searchLabel: `${c.name} ${c.dialCode}`,
          countryName: c.name,
          flag: c.flag,
          key: c.code,
        }))}
        filterOption={(input, option) =>
          (option?.searchLabel || '').toLowerCase().includes(input.toLowerCase())
        }
        optionRender={(option) => (
          <span>
            <span style={{ marginRight: 6 }}>{option.data.flag}</span>
            <span style={{ color: '#888', fontSize: 12, marginRight: 6 }}>{option.data.value}</span>
            <span style={{ color: '#444', fontSize: 12 }}>{option.data.countryName}</span>
          </span>
        )}
        labelRender={() => (
          <span style={{ fontWeight: 500 }}>
            {selected.flag} {selected.dialCode}
          </span>
        )}
      />
      <Input
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        size={size}
        style={{ borderRadius: '0 8px 8px 0', height: 40, flex: 1 }}
        maxLength={15}
      />
    </Space.Compact>
  );
};

export default PhoneInput;
