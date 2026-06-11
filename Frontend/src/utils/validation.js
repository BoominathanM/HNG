// Email validation rules for Ant Design Form.Item
export const emailRules = (required = false) => {
  const rules = [{ type: 'email', message: 'Enter a valid email address' }];
  if (required) rules.unshift({ required: true, message: 'Email is required' });
  return rules;
};

// Number-of-digits rules per dial code (digits after the country prefix, not counting the +XX itself)
const PHONE_RULES = new Map([
  ['+1',   { min: 10, max: 10 }], // USA / Canada
  ['+7',   { min: 10, max: 10 }], // Russia / Kazakhstan
  ['+20',  { min: 10, max: 10 }], // Egypt
  ['+27',  { min: 9,  max: 9  }], // South Africa
  ['+30',  { min: 10, max: 10 }], // Greece
  ['+31',  { min: 9,  max: 9  }], // Netherlands
  ['+32',  { min: 8,  max: 9  }], // Belgium
  ['+33',  { min: 9,  max: 9  }], // France
  ['+34',  { min: 9,  max: 9  }], // Spain
  ['+36',  { min: 9,  max: 9  }], // Hungary
  ['+39',  { min: 9,  max: 10 }], // Italy
  ['+40',  { min: 9,  max: 9  }], // Romania
  ['+41',  { min: 9,  max: 9  }], // Switzerland
  ['+43',  { min: 7,  max: 12 }], // Austria
  ['+44',  { min: 10, max: 11 }], // UK
  ['+45',  { min: 8,  max: 8  }], // Denmark
  ['+46',  { min: 7,  max: 9  }], // Sweden
  ['+47',  { min: 8,  max: 8  }], // Norway
  ['+48',  { min: 9,  max: 9  }], // Poland
  ['+49',  { min: 10, max: 12 }], // Germany
  ['+51',  { min: 9,  max: 9  }], // Peru
  ['+52',  { min: 10, max: 10 }], // Mexico
  ['+54',  { min: 10, max: 11 }], // Argentina
  ['+55',  { min: 10, max: 11 }], // Brazil
  ['+56',  { min: 9,  max: 9  }], // Chile
  ['+57',  { min: 10, max: 10 }], // Colombia
  ['+60',  { min: 9,  max: 10 }], // Malaysia
  ['+61',  { min: 9,  max: 9  }], // Australia
  ['+62',  { min: 9,  max: 12 }], // Indonesia
  ['+63',  { min: 10, max: 10 }], // Philippines
  ['+64',  { min: 8,  max: 10 }], // New Zealand
  ['+65',  { min: 8,  max: 8  }], // Singapore
  ['+66',  { min: 9,  max: 9  }], // Thailand
  ['+81',  { min: 10, max: 11 }], // Japan
  ['+82',  { min: 9,  max: 11 }], // South Korea
  ['+84',  { min: 9,  max: 10 }], // Vietnam
  ['+86',  { min: 11, max: 11 }], // China
  ['+90',  { min: 10, max: 10 }], // Turkey
  ['+91',  { min: 10, max: 10 }], // India
  ['+92',  { min: 10, max: 10 }], // Pakistan
  ['+94',  { min: 9,  max: 9  }], // Sri Lanka
  ['+95',  { min: 7,  max: 9  }], // Myanmar
  ['+98',  { min: 10, max: 10 }], // Iran
  ['+212', { min: 9,  max: 9  }], // Morocco
  ['+213', { min: 9,  max: 9  }], // Algeria
  ['+216', { min: 8,  max: 8  }], // Tunisia
  ['+218', { min: 9,  max: 10 }], // Libya
  ['+234', { min: 10, max: 11 }], // Nigeria
  ['+254', { min: 9,  max: 9  }], // Kenya
  ['+255', { min: 9,  max: 9  }], // Tanzania
  ['+256', { min: 9,  max: 9  }], // Uganda
  ['+260', { min: 9,  max: 9  }], // Zambia
  ['+263', { min: 9,  max: 9  }], // Zimbabwe
  ['+351', { min: 9,  max: 9  }], // Portugal
  ['+352', { min: 9,  max: 11 }], // Luxembourg
  ['+353', { min: 9,  max: 9  }], // Ireland
  ['+358', { min: 9,  max: 11 }], // Finland
  ['+380', { min: 9,  max: 9  }], // Ukraine
  ['+381', { min: 9,  max: 9  }], // Serbia
  ['+420', { min: 9,  max: 9  }], // Czech Republic
  ['+421', { min: 9,  max: 9  }], // Slovakia
  ['+880', { min: 10, max: 10 }], // Bangladesh
  ['+886', { min: 9,  max: 9  }], // Taiwan
  ['+961', { min: 7,  max: 8  }], // Lebanon
  ['+962', { min: 9,  max: 9  }], // Jordan
  ['+963', { min: 9,  max: 9  }], // Syria
  ['+964', { min: 10, max: 10 }], // Iraq
  ['+966', { min: 9,  max: 9  }], // Saudi Arabia
  ['+968', { min: 8,  max: 8  }], // Oman
  ['+971', { min: 9,  max: 9  }], // UAE
  ['+972', { min: 9,  max: 9  }], // Israel
  ['+973', { min: 8,  max: 8  }], // Bahrain
  ['+974', { min: 8,  max: 8  }], // Qatar
  ['+975', { min: 7,  max: 8  }], // Bhutan
  ['+976', { min: 8,  max: 8  }], // Mongolia
  ['+977', { min: 9,  max: 10 }], // Nepal
  ['+992', { min: 9,  max: 9  }], // Tajikistan
  ['+993', { min: 8,  max: 8  }], // Turkmenistan
  ['+994', { min: 9,  max: 9  }], // Azerbaijan
  ['+995', { min: 9,  max: 9  }], // Georgia
  ['+996', { min: 9,  max: 9  }], // Kyrgyzstan
  ['+998', { min: 9,  max: 9  }], // Uzbekistan
]);

// Parse stored "+<dialCode><digits>" value and return the matching rule + number portion
function parsePhoneValue(value) {
  if (!value || !value.startsWith('+')) return null;
  // Try longest dial codes first to avoid prefix conflicts (+1 vs +12 etc.)
  const dialCodes = [...PHONE_RULES.keys()].sort((a, b) => b.length - a.length);
  for (const dc of dialCodes) {
    if (value.startsWith(dc)) {
      return { dialCode: dc, number: value.slice(dc.length), rule: PHONE_RULES.get(dc) };
    }
  }
  return null;
}

// Phone validator for Ant Design Form.Item rules
// value format: "+<dialCode><number>" e.g. "+919876543210"
export const phoneValidator = (required = false) => ({
  validator(_, value) {
    // Try to match a known country and extract the number portion
    const parsed = value ? parsePhoneValue(value) : null;

    if (parsed) {
      const digits = parsed.number.replace(/\D/g, '');
      // No digits entered yet (only the dial code is stored)
      if (digits.length === 0) {
        return required
          ? Promise.reject(new Error('Phone number is required'))
          : Promise.resolve();
      }
      const { min, max } = parsed.rule;
      if (digits.length < min || digits.length > max) {
        const range = min === max ? `${min}` : `${min}–${max}`;
        return Promise.reject(new Error(`Phone number must be ${range} digits for ${parsed.dialCode}`));
      }
    } else {
      // No value, or unrecognized country code — generic empty / length check
      const digits = (value || '').replace(/\D/g, '');
      if (digits.length === 0) {
        return required
          ? Promise.reject(new Error('Phone number is required'))
          : Promise.resolve();
      }
      if (digits.length < 7 || digits.length > 15) {
        return Promise.reject(new Error('Enter a valid phone number (7–15 digits)'));
      }
    }

    return Promise.resolve();
  },
});
