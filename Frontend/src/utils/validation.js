// Email validation rules for Ant Design Form.Item
export const emailRules = (required = false) => {
  const rules = [{ type: 'email', message: 'Enter a valid email address' }];
  if (required) rules.unshift({ required: true, message: 'Email is required' });
  return rules;
};

// Phone validator for Ant Design Form.Item rules
// value format: "+<dialCode><number>" e.g. "+919876543210"
// total digit count (including country code) must be 9–15
export const phoneValidator = (required = false) => ({
  validator(_, value) {
    if (!value) {
      return required ? Promise.reject(new Error('Phone number is required')) : Promise.resolve();
    }
    // Strip everything except digits from the value
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return Promise.reject(new Error('Enter a valid phone number'));
    }
    return Promise.resolve();
  },
});
