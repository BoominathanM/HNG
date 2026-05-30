export const SIZE_MAP = {
  Soap: '2.5cm x 2.5cm',
  Shampoo: '2cm x 3cm',
  'Coconut Oil': '2cm x 3cm',
  Conditioner: '2cm x 3cm',
  'Shower Gel': '2cm x 3cm',
  'Dental Kit': '3cm x 2cm',
};

export const PAYMENT_LABELS = {
  BEFORE_100: '100% Payment Before Dispatch',
  ON_DISPATCH: '50% Advance, 50% on Dispatch',
  '50_ADVANCE_50_AFTER': '50% adv 50% on delivery',
  CREDIT_10_30: 'Credit (10days to 1 month)',
};

export const DESIGN_FLOW = [
  'Sent', 'Design Confirmation', 'In Process', 'Dispatch',
  'Received', 'Pending Approval', 'Design Change', 'Approved', 'Printing', 'Completed',
];

export const designColor = {
  Sent: 'blue', 'Design Confirmation': 'cyan', 'In Process': 'orange',
  Dispatch: 'purple', Received: 'geekblue', 'Pending Approval': 'gold',
  'Design Change': 'red', Approved: 'green', Printing: 'magenta', Completed: 'success',
};

export const statusPill = {
  Approved: 'green', Waiting: 'gold', Partial: 'orange', Received: 'green',
  'Not Received': 'default', Printing: 'magenta', 'In Process': 'orange',
  'Not Started': 'default', Available: 'success', Busy: 'warning',
};

export const FLOW_STAGES = [
  'Order Received', 'Sent To Design', 'Client Approved', 'Printing', 'Stock Received', 'Task Assigned',
];

export const designerCredentials = {
  username: 'designops@healnglow.com',
  password: 'HNG@Design2024',
  portal: 'Internal design portal — share only with authorized design staff',
};

export const getDefaultSize = (product) => {
  const key = Object.keys(SIZE_MAP).find((item) => product.toLowerCase().includes(item.toLowerCase()));
  return key ? SIZE_MAP[key] : '2cm x 3cm';
};

export const getProgressFromChecks = (checks) => {
  if (!checks) return 0;
  const keys = ['designRequired', 'pdfReady', 'designSent', 'clientApproved', 'printingStarted', 'stockReceived', 'operationApproved'];
  const done = keys.filter((k) => checks[k]).length;
  return Math.round((done / keys.length) * 100);
};

export const canAssignTaskFromChecks = (checks) => {
  if (!checks) return false;
  return checks.pdfReady && checks.designSent && checks.clientApproved &&
    checks.printingStarted && checks.stockReceived && checks.operationApproved;
};

export const getFlowStep = (order) => {
  const r = order.readiness || {};
  if (order.taskStatus === 'Full') return 5;
  if (r.stockReceived && r.operationApproved) return 4;
  if (order.printingStatus === 'In Process' || order.printingStatus === 'Printing') return 3;
  if (r.clientApproved) return 2;
  if (r.designSent) return 1;
  return 0;
};

export const buildProductionQueues = (orders = []) => ({
  sticker: orders.flatMap((order) =>
    (order.items || []).filter((item) => item.logoType === 'Sticker').map((item) => ({
      key: `${order.id}-${item.key}-sticker`,
      orderId: order.id,
      hotelLogo: order.hotelLogo || order.clientName,
      product: item.product,
      qty: item.qty,
      size: item.size || getDefaultSize(item.product),
      status: order.designStatus,
      sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.7),
      verified: order.stockStatus === 'Received',
      note: (order.notifications || [])[0] || '',
    }))
  ),
  box: orders.flatMap((order) =>
    (order.items || []).filter((item) => item.logoType === 'Box').map((item) => ({
      key: `${order.id}-${item.key}-box`,
      orderId: order.id,
      hotelLogo: order.hotelLogo || order.clientName,
      product: item.product,
      qty: item.qty,
      size: item.size,
      status: order.designStatus,
      sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.65),
      verified: false,
      note: 'Box manufacturing follows same approval flow as sticker printing',
    }))
  ),
  frosted: orders.flatMap((order) =>
    (order.items || []).filter((item) => item.logoType === 'Frosted Ziplock').map((item) => ({
      key: `${order.id}-${item.key}-frosted`,
      orderId: order.id,
      hotelLogo: order.hotelLogo || order.clientName,
      product: item.product,
      qty: item.qty,
      size: item.size,
      status: order.designStatus,
      sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.5),
      verified: order.stockStatus === 'Received',
      note: 'Dispatch and received updates should be verified by operations',
    }))
  ),
});

export const getCheckStateMap = (orders = []) =>
  Object.fromEntries(orders.map((order) => [order.id || order._id, { ...(order.readiness || {}) }]));
