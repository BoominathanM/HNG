const calculateGST = (amount, rate, sellerState = '', buyerState = '') => {
  if (!rate || rate === 0) return { cgst: 0, sgst: 0, igst: 0, total: 0 };
  const gstAmt = parseFloat((amount * (rate / 100)).toFixed(2));
  if (sellerState && buyerState && sellerState.toLowerCase() !== buyerState.toLowerCase()) {
    return { cgst: 0, sgst: 0, igst: gstAmt, total: gstAmt };
  }
  const half = parseFloat((gstAmt / 2).toFixed(2));
  return { cgst: half, sgst: half, igst: 0, total: gstAmt };
};

const validateGSTIN = (gstin) => {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin);
};

module.exports = { calculateGST, validateGSTIN };
