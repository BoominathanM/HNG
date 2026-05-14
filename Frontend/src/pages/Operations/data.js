export const operationEmployees = [
  { key: 'e1', name: 'Ramesh Kumar', role: 'Production Lead', activeTask: 'Shampoo Filling', availability: 'Available' },
  { key: 'e2', name: 'Meena Devi', role: 'Packing Staff', activeTask: 'Dental Kit Sealing', availability: 'Available' },
  { key: 'e3', name: 'Kavitha S', role: 'Sticker Team', activeTask: 'Sticker Placing', availability: 'Busy' },
  { key: 'e4', name: 'Suresh T', role: 'Quality Check', activeTask: 'Verification', availability: 'Available' },
];

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
  '50_ADVANCE_50_AFTER': '50% Advance, 50% After Delivery',
};

export const DESIGN_FLOW = [
  'Sent',
  'Design Confirmation',
  'In Process',
  'Dispatch',
  'Received',
  'Pending Approval',
  'Design Change',
  'Approved',
  'Printing',
  'Completed',
];

export const designColor = {
  Sent: 'blue',
  'Design Confirmation': 'cyan',
  'In Process': 'orange',
  Dispatch: 'purple',
  Received: 'geekblue',
  'Pending Approval': 'gold',
  'Design Change': 'red',
  Approved: 'green',
  Printing: 'magenta',
  Completed: 'success',
};

export const statusPill = {
  Approved: 'green',
  Waiting: 'gold',
  Partial: 'orange',
  Received: 'green',
  'Not Received': 'default',
  Printing: 'magenta',
  'In Process': 'orange',
  'Not Started': 'default',
  Available: 'success',
  Busy: 'warning',
};

export const getDefaultSize = (product) => {
  const key = Object.keys(SIZE_MAP).find((item) =>
    product.toLowerCase().includes(item.toLowerCase())
  );
  return key ? SIZE_MAP[key] : '2cm x 3cm';
};

export const operationOrders = [
  {
    key: '1',
    id: 'ORD-2401',
    hotelLogo: 'The Grand Hotel',
    salesPerson: 'Priya',
    createdAt: '2026-05-01T09:00:00Z',
    orderType: 'Sticker + Box',
    clientApproval: 'Approved',
    designStatus: 'Approved',
    printingStatus: 'Printing',
    stockStatus: 'Partial',
    operationStage: 'Waiting for sticker stock',
    taskStatus: 'Partial',
    assignedEmployee: 'Ramesh Kumar',
    printerSentTotal: 3600,
    printerVerified: false,
    inventoryStock: 2400,
    orderReceivedStock: 1800,
    notifications: ['Design approved by client', 'Printer has not updated dispatch balance'],
    specsSummary: 'Soap and shampoo amenities with hotel logo',
    paymentTerms: '50_ADVANCE_50_AFTER',
    paymentReminderDate: '2026-03-15',
    deliveryBy: 'HNG',
    transportationBy: 'CLIENT',
    forwardingCharge: false,
    totalAmount: 4100,
    advance: 2050,
    expectedDelivery: '2026-06-10',
    leadId: 'LEAD-1001',
    quotationId: 'QT-1001',
    negotiationId: 'NEG-1001',
    contactPerson: 'Reception',
    phone: '+91 94430 39517',
    location: 'Coimbatore',
    paymentProofs: [
      { name: 'advance_receipt_jan25.pdf', size: 45678, url: '#' },
    ],
    items: [
      {
        key: '1-1',
        product: 'Soap Round 50g',
        qty: 2000,
        inventoryStock: 2400,
        logoType: 'Sticker',
        size: '2.5cm x 2.5cm',
        packaging: 'Soap Wrapper',
        material: 'Gloss Sticker',
        sampleSize: '2.5cm x 2.5cm',
        processTask: 'Sticker placing',
      },
      {
        key: '1-2',
        product: 'Shampoo 30ml',
        qty: 2000,
        inventoryStock: 1800,
        logoType: 'Sticker',
        size: '2cm x 3cm',
        packaging: 'Bottle',
        material: 'Waterproof Sticker',
        sampleSize: '2cm x 3cm',
        processTask: 'Filling + sticker placing',
      },
      {
        key: '1-3',
        product: 'Dental Kit Box',
        qty: 2000,
        inventoryStock: 850,
        logoType: 'Box',
        size: 'PVK',
        packaging: 'Paper Box',
        material: 'PVC Board',
        sampleSize: 'PVK',
        processTask: 'Box filling',
      },
    ],
    readiness: {
      designRequired: true,
      pdfReady: true,
      designSent: true,
      clientApproved: true,
      printingStarted: true,
      stockReceived: false,
      operationApproved: false,
      alertInventory: true,
      alertPrinter: true,
      startBottleFilling: true,
    },
  },
  {
    key: '2',
    id: 'ORD-2402',
    hotelLogo: 'Marriott Mumbai',
    salesPerson: 'Arun',
    createdAt: '2026-05-02T10:30:00Z',
    orderType: 'Sticker',
    clientApproval: 'Waiting',
    designStatus: 'Pending Approval',
    printingStatus: 'Not Started',
    stockStatus: 'Not Received',
    operationStage: 'Send design to customer',
    taskStatus: 'Pending',
    assignedEmployee: 'Kavitha S',
    printerSentTotal: 0,
    printerVerified: false,
    inventoryStock: 1200,
    orderReceivedStock: 0,
    notifications: ['Customer approval pending', 'Sales person must confirm artwork'],
    specsSummary: 'Shampoo, shower gel, conditioner set',
    paymentTerms: 'ON_DISPATCH',
    paymentReminderDate: null,
    deliveryBy: 'HNG',
    transportationBy: 'CLIENT',
    forwardingCharge: true,
    totalAmount: 5075,
    advance: 0,
    expectedDelivery: '2026-06-20',
    leadId: 'LEAD-1002',
    quotationId: 'QT-1002',
    negotiationId: null,
    contactPerson: 'Manager',
    phone: '+91 98200 12345',
    location: 'Mumbai',
    paymentProofs: [],
    items: [
      {
        key: '2-1',
        product: 'Shampoo 30ml',
        qty: 3000,
        inventoryStock: 1200,
        logoType: 'Sticker',
        size: '2cm x 3cm',
        packaging: 'Bottle',
        material: 'Waterproof Sticker',
        sampleSize: '2cm x 3cm',
        processTask: 'Filling + sticker placing',
      },
      {
        key: '2-2',
        product: 'Shower Gel 30ml',
        qty: 3000,
        inventoryStock: 800,
        logoType: 'Sticker',
        size: '2cm x 3cm',
        packaging: 'Bottle',
        material: 'Waterproof Sticker',
        sampleSize: '2cm x 3cm',
        processTask: 'Filling + sticker placing',
      },
      {
        key: '2-3',
        product: 'Conditioner 30ml',
        qty: 3000,
        inventoryStock: 600,
        logoType: 'Sticker',
        size: '2cm x 3cm',
        packaging: 'Bottle',
        material: 'Waterproof Sticker',
        sampleSize: '2cm x 3cm',
        processTask: 'Filling + sticker placing',
      },
    ],
    readiness: {
      designRequired: true,
      pdfReady: true,
      designSent: true,
      clientApproved: false,
      printingStarted: false,
      stockReceived: false,
      operationApproved: false,
      alertInventory: false,
      alertPrinter: false,
      startBottleFilling: true,
    },
  },
  {
    key: '3',
    id: 'ORD-2403',
    hotelLogo: 'Taj Hotels',
    salesPerson: 'Karthik',
    createdAt: '2026-05-03T08:15:00Z',
    orderType: 'Frosted Ziplock',
    clientApproval: 'Approved',
    designStatus: 'Printing',
    printingStatus: 'In Process',
    stockStatus: 'Received',
    operationStage: 'Ready for filling work',
    taskStatus: 'Full',
    assignedEmployee: 'Meena Devi',
    printerSentTotal: 1500,
    printerVerified: true,
    inventoryStock: 2000,
    orderReceivedStock: 1500,
    notifications: ['Filling work can start before final ziplock receipt'],
    specsSummary: 'Dental kit and amenity pouch order',
    paymentTerms: 'BEFORE_100',
    paymentReminderDate: null,
    deliveryBy: 'CLIENT',
    transportationBy: 'CLIENT',
    forwardingCharge: false,
    totalAmount: 3000,
    advance: 3000,
    expectedDelivery: '2026-06-15',
    leadId: 'LEAD-1003',
    quotationId: 'QT-1003',
    negotiationId: 'NEG-1003',
    contactPerson: 'GM Office',
    phone: '+91 98765 43210',
    location: 'New Delhi',
    paymentProofs: [
      { name: 'full_payment_receipt.pdf', size: 32768, url: '#' },
      { name: 'bank_transfer_confirm.jpg', size: 128000, url: '#' },
    ],
    items: [
      {
        key: '3-1',
        product: 'Dental Kit',
        qty: 1500,
        inventoryStock: 2000,
        logoType: 'Frosted Ziplock',
        size: '15cm x 10cm',
        packaging: 'Ziplock Pouch',
        material: 'Frosted',
        sampleSize: '15cm x 10cm',
        processTask: 'Sticker + sealing',
      },
      {
        key: '3-2',
        product: 'Coconut Oil 30ml',
        qty: 1500,
        inventoryStock: 1200,
        logoType: 'Sticker',
        size: '2cm x 3cm',
        packaging: 'Bottle',
        material: 'Waterproof Sticker',
        sampleSize: '2cm x 3cm',
        processTask: 'Filling + sticker placing',
      },
    ],
    readiness: {
      designRequired: true,
      pdfReady: true,
      designSent: true,
      clientApproved: true,
      printingStarted: true,
      stockReceived: true,
      operationApproved: true,
      alertInventory: true,
      alertPrinter: false,
      startBottleFilling: true,
    },
  },
];

export const designQueue = [
  {
    key: 'd1',
    orderId: 'ORD-2402',
    hotelLogo: 'Marriott Mumbai',
    channel: 'WhatsApp + Sales',
    type: 'Sticker',
    status: 'Pending Approval',
    designer: 'Design Team A',
    correction: 'Client asked to align logo and reduce text size',
  },
  {
    key: 'd2',
    orderId: 'ORD-2403',
    hotelLogo: 'Taj Hotels',
    channel: 'WhatsApp',
    type: 'Frosted Ziplock',
    status: 'In Process',
    designer: 'Design Team B',
    correction: 'No change requested',
  },
];

export const productionQueues = {
  sticker: operationOrders
    .flatMap((order) =>
      order.items
        .filter((item) => item.logoType === 'Sticker')
        .map((item) => ({
          key: `${order.id}-${item.key}-sticker`,
          orderId: order.id,
          hotelLogo: order.hotelLogo,
          product: item.product,
          qty: item.qty,
          size: item.size || getDefaultSize(item.product),
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.7),
          verified: order.stockStatus === 'Received',
          note: order.notifications[0],
        }))
    ),
  box: operationOrders
    .flatMap((order) =>
      order.items
        .filter((item) => item.logoType === 'Box')
        .map((item) => ({
          key: `${order.id}-${item.key}-box`,
          orderId: order.id,
          hotelLogo: order.hotelLogo,
          product: item.product,
          qty: item.qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.65),
          verified: false,
          note: 'Box manufacturing follows same approval flow as sticker printing',
        }))
    ),
  frosted: operationOrders
    .flatMap((order) =>
      order.items
        .filter((item) => item.logoType === 'Frosted Ziplock')
        .map((item) => ({
          key: `${order.id}-${item.key}-frosted`,
          orderId: order.id,
          hotelLogo: order.hotelLogo,
          product: item.product,
          qty: item.qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(item.qty * 0.5),
          verified: order.stockStatus === 'Received',
          note: 'Dispatch and received updates should be verified by operations',
        }))
    ),
};

export const getCheckStateMap = () =>
  Object.fromEntries(operationOrders.map((order) => [order.id, { ...order.readiness }]));

export const getProgressFromChecks = (checks) => {
  if (!checks) return 0;
  const progressKeys = [
    'designRequired',
    'pdfReady',
    'designSent',
    'clientApproved',
    'printingStarted',
    'stockReceived',
    'operationApproved',
  ];
  const done = progressKeys.filter((key) => checks[key]).length;
  return Math.round((done / progressKeys.length) * 100);
};

export const canAssignTaskFromChecks = (checks) => {
  if (!checks) return false;
  return (
    checks.pdfReady &&
    checks.designSent &&
    checks.clientApproved &&
    checks.printingStarted &&
    checks.stockReceived &&
    checks.operationApproved
  );
};

export const designerCredentials = {
  username: 'designops@healnglow.com',
  password: 'HNG@Design2024',
  portal: 'Internal design portal — share only with authorized design staff',
};

export const FLOW_STAGES = [
  'Order Received',
  'Sent To Design',
  'Client Approved',
  'Printing',
  'Stock Received',
  'Task Assigned',
];

export const getFlowStep = (order) => {
  const r = order.readiness || {};
  if (order.taskStatus === 'Full') return 5;
  if (r.stockReceived && r.operationApproved) return 4;
  if (order.printingStatus === 'In Process' || order.printingStatus === 'Printing') return 3;
  if (r.clientApproved) return 2;
  if (r.designSent) return 1;
  return 0;
};
