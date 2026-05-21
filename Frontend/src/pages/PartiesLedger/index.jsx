import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Input, Select, Typography,
  Space, Tabs, DatePicker, Form
} from 'antd';
import {
  SearchOutlined, EyeOutlined, LeftOutlined,
  BookOutlined, ShopOutlined, ArrowUpOutlined,
  ArrowDownOutlined, WalletOutlined, TeamOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined,
  FileTextOutlined, PrinterOutlined, DownloadOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#B11E6A';
const FONT_SIZE = 13;

const supplierParties = [
  { key: 'SP-001', name: 'ChemCo India', type: 'Supplier', phone: '+91 98765 43210', email: 'info@chemco.in', address: 'Mumbai, MH', totalPurchase: 125000, paid: 80000, pending: 45000 },
  { key: 'SP-002', name: 'BioLife Ltd', type: 'Supplier', phone: '+91 87654 32109', email: 'contact@biolife.in', address: 'Chennai, TN', totalPurchase: 88000, paid: 88000, pending: 0 },
  { key: 'SP-003', name: 'PlastiPack', type: 'Supplier', phone: '+91 76543 21098', email: 'sales@plastipack.com', address: 'Delhi, DL', totalPurchase: 44500, paid: 22500, pending: 22000 },
  { key: 'SP-004', name: 'BoxWorld', type: 'Supplier', phone: '+91 65432 10987', email: 'info@boxworld.in', address: 'Bengaluru, KA', totalPurchase: 12000, paid: 0, pending: 12000 },
  {
    key: 'SP-005', name: 'The Lily', type: 'Supplier',
    phone: '9626332259', email: 'thelily.kalpaga@gmail.com',
    address: 'No.10, Edayanchattu Main Road, Vellore - 632002',
    gst: 'TN/ASU/1406',
    totalPurchase: 814665, paid: 638788, pending: 175877
  },
];

const customerParties = [
  { key: 'CU-001', name: 'Marriott Mumbai', type: 'Customer', phone: '+91 22 6651 1234', email: 'purchase@marriott.in', address: 'Mumbai, MH', totalSales: 95000, received: 70000, pending: 25000 },
  { key: 'CU-002', name: 'Taj Hotels Delhi', type: 'Customer', phone: '+91 11 6600 7777', email: 'orders@tajhotels.in', address: 'Delhi, DL', totalSales: 141600, received: 60000, pending: 81600 },
  { key: 'CU-003', name: 'ITC Grand Kolkata', type: 'Customer', phone: '+91 33 2288 9999', email: 'supply@itchotels.in', address: 'Kolkata, WB', totalSales: 250000, received: 250000, pending: 0 },
  { key: 'CU-004', name: 'Hyatt Chennai', type: 'Customer', phone: '+91 44 6150 1234', email: 'procurement@hyatt.in', address: 'Chennai, TN', totalSales: 60000, received: 42000, pending: 18000 },
  { key: 'CU-005', name: 'The Grand Hotel', type: 'Customer', phone: '+91 11 2345 6789', email: 'billing@grandhotel.in', address: 'New Delhi, DL', totalSales: 49560, received: 21000, pending: 28560 },
  { key: 'CU-006', name: 'Client Demo', type: 'Customer', phone: '', email: '', address: '', totalSales: 88500, received: 27000, pending: 61500 },
];

const ledgerByParty = {
  'SP-001': [
    { key: 1, date: '2024-05-01', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-CHEM-101', debit: 85000, credit: 0, balance: 85000 },
    { key: 2, date: '2024-05-10', particulars: 'By Bank Payment', vch_type: 'Payment', vch_no: 'PAY-001', debit: 0, credit: 40000, balance: 45000 },
    { key: 3, date: '2024-05-15', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-CHEM-109', debit: 40000, credit: 0, balance: 85000 },
    { key: 4, date: '2024-05-20', particulars: 'By Bank Payment', vch_type: 'Payment', vch_no: 'PAY-002', debit: 0, credit: 40000, balance: 45000 },
  ],
  'SP-002': [
    { key: 1, date: '2024-05-04', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-BIO-452', debit: 44000, credit: 0, balance: 44000 },
    { key: 2, date: '2024-05-18', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-BIO-455', debit: 44000, credit: 0, balance: 88000 },
    { key: 3, date: '2024-05-19', particulars: 'By Bank Payment', vch_type: 'Payment', vch_no: 'PAY-BIO-001', debit: 0, credit: 88000, balance: 0 },
  ],
  'SP-003': [
    { key: 1, date: '2024-05-06', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-PP-203', debit: 22500, credit: 0, balance: 22500 },
    { key: 2, date: '2024-05-22', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-PP-211', debit: 22000, credit: 0, balance: 44500 },
    { key: 3, date: '2024-05-23', particulars: 'By Bank Payment', vch_type: 'Payment', vch_no: 'PAY-PP-001', debit: 0, credit: 22500, balance: 22000 },
  ],
  'SP-004': [
    { key: 1, date: '2024-05-15', particulars: 'To Purchase Invoice', vch_type: 'Purchase', vch_no: 'INV-BW-100', debit: 12000, credit: 0, balance: 12000 },
  ],
  'SP-005': [
    { key: 1,  date: '2025-09-01', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '744',  debit: 11800,  credit: 0,     balance: 11800 },
    { key: 2,  date: '2025-09-05', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '767',  debit: 10738,  credit: 0,     balance: 22538 },
    { key: 3,  date: '2025-09-06', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '238', debit: 0,     credit: 11800, balance: 10738 },
    { key: 4,  date: '2025-09-08', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '779',  debit: 6136,   credit: 0,     balance: 16874 },
    { key: 5,  date: '2025-09-10', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '794',  debit: 3068,   credit: 0,     balance: 19942 },
    { key: 6,  date: '2025-09-10', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '246', debit: 0,     credit: 15000, balance: 4942 },
    { key: 7,  date: '2025-09-11', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '800',  debit: 18408,  credit: 0,     balance: 23350 },
    { key: 8,  date: '2025-09-15', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '253', debit: 0,     credit: 3835,  balance: 19515 },
    { key: 9,  date: '2025-09-18', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '838',  debit: 3835,   credit: 0,     balance: 23350 },
    { key: 10, date: '2025-09-30', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '890',  debit: 6825,   credit: 0,     balance: 30175 },
    { key: 11, date: '2025-10-21', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '314', debit: 0,     credit: 20000, balance: 10175 },
    { key: 12, date: '2025-10-27', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1013', debit: 3413,   credit: 0,     balance: 13588 },
    { key: 13, date: '2025-10-27', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '320', debit: 0,     credit: 3413,  balance: 10175 },
    { key: 14, date: '2025-11-29', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '359', debit: 0,     credit: 2000,  balance: 8175 },
    { key: 15, date: '2025-12-16', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1223', debit: 25200,  credit: 0,     balance: 33375 },
    { key: 16, date: '2025-12-23', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '380', debit: 0,     credit: 45000, balance: -11625 },
    { key: 17, date: '2025-12-24', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1261', debit: 26565,  credit: 0,     balance: 14940 },
    { key: 18, date: '2025-12-27', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1279', debit: 5250,   credit: 0,     balance: 20190 },
    { key: 19, date: '2025-12-30', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1288', debit: 5250,   credit: 0,     balance: 25440 },
    { key: 20, date: '2026-01-01', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1295', debit: 31500,  credit: 0,     balance: 56940 },
    { key: 21, date: '2026-01-07', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1314', debit: 13125,  credit: 0,     balance: 70065 },
    { key: 22, date: '2026-01-10', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1328', debit: 23625,  credit: 0,     balance: 93690 },
    { key: 23, date: '2026-01-22', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1373', debit: 2730,   credit: 0,     balance: 96420 },
    { key: 24, date: '2026-02-04', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1423', debit: 6340,   credit: 0,     balance: 102760 },
    { key: 25, date: '2026-02-04', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '418', debit: 0,     credit: 15000, balance: 87760 },
    { key: 26, date: '2026-02-12', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1461', debit: 13650,  credit: 0,     balance: 101410 },
    { key: 27, date: '2026-02-14', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1471', debit: 19110,  credit: 0,     balance: 120520 },
    { key: 28, date: '2026-02-24', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1506', debit: 10920,  credit: 0,     balance: 131440 },
    { key: 29, date: '2026-02-27', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1518', debit: 68250,  credit: 0,     balance: 199690 },
    { key: 30, date: '2026-02-27', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '440', debit: 0,     credit: 68250, balance: 131440 },
    { key: 31, date: '2026-03-03', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1538', debit: 4050,   credit: 0,     balance: 135490 },
    { key: 32, date: '2026-03-03', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '444', debit: 0,     credit: 4050,  balance: 131440 },
    { key: 33, date: '2026-03-04', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '447', debit: 0,     credit: 9499,  balance: 121941 },
    { key: 34, date: '2026-03-06', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1549', debit: 9949,   credit: 0,     balance: 131890 },
    { key: 35, date: '2026-03-10', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1563', debit: 40950,  credit: 0,     balance: 172840 },
    { key: 36, date: '2026-03-10', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '450', debit: 0,     credit: 25000, balance: 147840 },
    { key: 37, date: '2026-03-11', particulars: 'To Sales @ 18%', vch_type: 'Sales', vch_no: '1573', debit: 3835,   credit: 0,     balance: 151675 },
    { key: 38, date: '2026-03-12', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1581', debit: 54600,  credit: 0,     balance: 206275 },
    { key: 39, date: '2026-03-12', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '451', debit: 0,     credit: 30000, balance: 176275 },
    { key: 40, date: '2026-03-13', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '453', debit: 0,     credit: 3675,  balance: 172600 },
    { key: 41, date: '2026-03-14', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '455', debit: 0,     credit: 30000, balance: 142600 },
    { key: 42, date: '2026-03-18', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '457', debit: 0,     credit: 30000, balance: 112600 },
    { key: 43, date: '2026-03-19', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1607', debit: 18375,  credit: 0,     balance: 130975 },
    { key: 44, date: '2026-03-24', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1615', debit: 27300,  credit: 0,     balance: 158275 },
    { key: 45, date: '2026-03-24', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '462', debit: 0,     credit: 27300, balance: 130975 },
    { key: 46, date: '2026-03-26', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1622', debit: 27300,  credit: 0,     balance: 158275 },
    { key: 47, date: '2026-03-28', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '1628', debit: 27300,  credit: 0,     balance: 185575 },
    { key: 48, date: '2026-04-03', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '4',   debit: 0,     credit: 16203, balance: 169372 },
    { key: 49, date: '2026-04-07', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '21',   debit: 12265,  credit: 0,     balance: 181637 },
    { key: 50, date: '2026-04-09', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '32',   debit: 3938,   credit: 0,     balance: 185575 },
    { key: 51, date: '2026-04-11', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '7',   debit: 0,     credit: 30250, balance: 155325 },
    { key: 52, date: '2026-04-11', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '43',   debit: 28875,  credit: 0,     balance: 184200 },
    { key: 53, date: '2026-04-15', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '48B',  debit: 43313,  credit: 0,     balance: 227513 },
    { key: 54, date: '2026-04-16', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '13',  debit: 0,     credit: 30000, balance: 197513 },
    { key: 55, date: '2026-04-18', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '55',   debit: 17325,  credit: 0,     balance: 214838 },
    { key: 56, date: '2026-04-18', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '16',  debit: 0,     credit: 10000, balance: 204838 },
    { key: 57, date: '2026-04-21', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '17',  debit: 0,     credit: 7875,  balance: 196963 },
    { key: 58, date: '2026-04-21', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '18',  debit: 0,     credit: 2888,  balance: 194075 },
    { key: 59, date: '2026-04-24', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '21',  debit: 0,     credit: 49000, balance: 145075 },
    { key: 60, date: '2026-04-25', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '76',   debit: 33338,  credit: 0,     balance: 178413 },
    { key: 61, date: '2026-04-25', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '23',  debit: 0,     credit: 8750,  balance: 169663 },
    { key: 62, date: '2026-04-29', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '91',   debit: 37538,  credit: 0,     balance: 207201 },
    { key: 63, date: '2026-04-30', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '27',  debit: 0,     credit: 30000, balance: 177201 },
    { key: 64, date: '2026-04-30', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '94',   debit: 9450,   credit: 0,     balance: 186651 },
    { key: 65, date: '2026-05-04', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '31',  debit: 0,     credit: 50000, balance: 136651 },
    { key: 66, date: '2026-05-05', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '114',  debit: 14438,  credit: 0,     balance: 151089 },
    { key: 67, date: '2026-05-07', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '120',  debit: 14438,  credit: 0,     balance: 165527 },
    { key: 68, date: '2026-05-08', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '43',  debit: 0,     credit: 30000, balance: 135527 },
    { key: 69, date: '2026-05-09', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '132',  debit: 28875,  credit: 0,     balance: 164402 },
    { key: 70, date: '2026-05-13', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '147',  debit: 34650,  credit: 0,     balance: 199052 },
    { key: 71, date: '2026-05-13', particulars: 'By HDFC BANK',   vch_type: 'Receipt', vch_no: '47',  debit: 0,     credit: 30000, balance: 169052 },
    { key: 72, date: '2026-05-14', particulars: 'To Sales @ 5%',  vch_type: 'Sales', vch_no: '156',  debit: 6825,   credit: 0,     balance: 175877 },
  ],
  'CU-001': [
    { key: 1, date: '2024-01-18', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2401', debit: 45430, credit: 0, balance: 45430 },
    { key: 2, date: '2024-02-01', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-MUM-001', debit: 0, credit: 19250, balance: 26180 },
    { key: 3, date: '2024-03-10', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-MUM-002', debit: 0, credit: 20000, balance: 6180 },
    { key: 4, date: '2024-04-15', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2414', debit: 18820, credit: 0, balance: 25000 },
  ],
  'CU-002': [
    { key: 1, date: '2024-01-17', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2402', debit: 141600, credit: 0, balance: 141600 },
    { key: 2, date: '2024-02-20', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-TAJ-001', debit: 0, credit: 60000, balance: 81600 },
  ],
  'CU-003': [
    { key: 1, date: '2024-01-16', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2403', debit: 250000, credit: 0, balance: 250000 },
    { key: 2, date: '2024-01-20', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-ITC-001', debit: 0, credit: 250000, balance: 0 },
  ],
  'CU-004': [
    { key: 1, date: '2024-03-01', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2410', debit: 42000, credit: 0, balance: 42000 },
    { key: 2, date: '2024-03-20', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-HYA-001', debit: 0, credit: 42000, balance: 0 },
    { key: 3, date: '2024-04-05', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2418', debit: 18000, credit: 0, balance: 18000 },
  ],
  'CU-005': [
    { key: 1, date: '2024-01-10', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2404', debit: 49560, credit: 0, balance: 49560 },
    { key: 2, date: '2024-02-05', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-GRD-001', debit: 0, credit: 21000, balance: 28560 },
  ],
  'CU-006': [
    { key: 1, date: '2023-11-20', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2389', debit: 29500, credit: 0, balance: 29500 },
    { key: 2, date: '2024-01-15', particulars: 'To Sales Invoice', vch_type: 'Invoice', vch_no: 'INV-2405', debit: 59000, credit: 0, balance: 88500 },
    { key: 3, date: '2024-02-10', particulars: 'By Bank Payment',  vch_type: 'Receipt', vch_no: 'PAY-DEM-001', debit: 0, credit: 27000, balance: 61500 },
  ],
};

export default function PartiesLedger() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [activeTab, setActiveTab] = useState('all');
  const [supplierList, setSupplierList] = useState(supplierParties);
  const [customerList, setCustomerList] = useState(customerParties);
  const [deletedParties, setDeletedParties] = useState([]);

  const deleteParty = (party) => {
    const now = new Date().toISOString();
    setDeletedParties(prev => [...prev, { ...party, deletedAt: now }]);
    if (party.type === 'Supplier') {
      setSupplierList(prev => prev.filter(p => p.key !== party.key));
    } else {
      setCustomerList(prev => prev.filter(p => p.key !== party.key));
    }
  };
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [allSearch, setAllSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewParty, setViewParty] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const allParties = [...supplierList, ...customerList];

  const totalSupplierPending = supplierList.reduce((s, p) => s + p.pending, 0);
  const totalCustomerPending = customerList.reduce((s, p) => s + p.pending, 0);
  const totalSupplierPaid = supplierList.reduce((s, p) => s + p.paid, 0);
  const totalCustomerReceived = customerList.reduce((s, p) => s + p.received, 0);

  const getLedger = (party) => {
    let entries = ledgerByParty[party.key] || [];
    if (dateRange && dateRange[0] && dateRange[1]) {
      entries = entries.filter(e => {
        const d = dayjs(e.date);
        return d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day'));
      });
    }
    return entries;
  };

  const downloadLedger = (party) => {
    const entries = ledgerByParty[party.key] || [];
    const totalDebit = entries.reduce((s, r) => s + r.debit, 0);
    const totalCredit = entries.reduce((s, r) => s + r.credit, 0);
    const closingBalance = entries.at(-1)?.balance ?? 0;
    const dateFrom = entries[0]?.date || '';
    const dateTo = entries.at(-1)?.date || '';

    const rows = entries.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.particulars}</td>
        <td>${e.vch_type}</td>
        <td>${e.vch_no}</td>
        <td class="num">${e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
        <td class="num">${e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Ledger - ${party.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header .company { font-size: 15px; font-weight: bold; }
  .header .address { font-size: 10px; line-height: 1.6; }
  .divider { border-top: 1px solid #000; margin: 6px 0; }
  .party-block { text-align: center; margin: 12px 0; }
  .party-block .pname { font-size: 13px; font-weight: bold; }
  .party-block .pdetail { font-size: 10px; line-height: 1.6; }
  .date-range { text-align: center; font-size: 11px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #000; padding: 5px 8px; background: #f5f5f5; font-size: 11px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10.5px; }
  .num { text-align: right; }
  .total-row td { border-top: 2px solid #000; font-weight: bold; background: #fafafa; }
  .closing-row td { font-weight: bold; }
  .balance-row td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; }
  .page-title { text-align: right; font-size: 10px; margin-bottom: 4px; }
  @media print {
    body { padding: 12px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="company">HEAL N GLOW PRIVATE LIMITED</div>
  <div class="address">
    THADICOMBU ROAD, DINDIGUL - 624 001, TAMIL NADU<br/>
    PH NO : 82480 93571
  </div>
</div>
<div class="divider"></div>
<div class="party-block">
  <div class="pname">${party.name}</div>
  <div class="pdetail">Ledger Account</div>
  ${party.address ? `<div class="pdetail">${party.address}</div>` : ''}
  ${party.phone ? `<div class="pdetail">PH: ${party.phone}</div>` : ''}
  ${party.email ? `<div class="pdetail">Email: ${party.email}</div>` : ''}
  ${party.gst ? `<div class="pdetail">GST/Lic No: ${party.gst}</div>` : ''}
</div>
<div class="date-range">${dateFrom} to ${dateTo}</div>
<div class="page-title">Page 1</div>
<table>
  <thead>
    <tr>
      <th style="width:90px">Date</th>
      <th>Particulars</th>
      <th style="width:80px">Vch Type</th>
      <th style="width:70px">Vch No.</th>
      <th style="width:110px" class="num">Debit</th>
      <th style="width:110px" class="num">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Total</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="closing-row">
      <td colspan="4" style="text-align:right">By Closing Balance</td>
      <td class="num"></td>
      <td class="num">${Math.abs(closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="balance-row">
      <td colspan="4" style="text-align:right"></td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const renderPartyView = () => {
    if (!viewParty) return null;
    const ledger = getLedger(viewParty);
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const netBalance = ledger.at(-1)?.balance ?? 0;
    const isSupplier = viewParty.type === 'Supplier';

    const ledgerColumns = [
      {
        title: 'Date', dataIndex: 'date', width: 100,
        render: v => <Text style={{ fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Particulars', dataIndex: 'particulars', width: 200,
        render: v => <Text style={{ fontSize: FONT_SIZE, color: textColor }}>{v}</Text>
      },
      {
        title: 'Vch Type', dataIndex: 'vch_type', width: 90,
        render: t => (
          <Tag
            style={{ borderRadius: 6, fontSize: FONT_SIZE - 1, border: `1px solid ${PRIMARY}22`, background: `${PRIMARY}10`, color: PRIMARY }}
          >
            {t}
          </Tag>
        )
      },
      {
        title: 'Vch No.', dataIndex: 'vch_no', width: 90,
        render: v => <Text style={{ color: PRIMARY, fontWeight: 600, fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Debit (Dr)', dataIndex: 'debit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Credit (Cr)', dataIndex: 'credit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Balance', dataIndex: 'balance', align: 'right', width: 120,
        render: v => (
          <Text strong style={{ color: v < 0 ? '#52c41a' : PRIMARY, fontSize: FONT_SIZE }}>
            ₹{Math.abs(v).toLocaleString()}{v < 0 ? ' Cr' : ' Dr'}
          </Text>
        )
      },
    ];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => { setViewParty(null); setDateRange(null); }}>
              Back to Parties
            </Button>
            <div>
              <Text strong style={{ color: PRIMARY, fontSize: 16 }}>{viewParty.name}</Text>
              <Tag
                style={{ marginLeft: 8, borderRadius: 10, border: `1px solid ${PRIMARY}33`, background: `${PRIMARY}10`, color: PRIMARY }}
              >
                {viewParty.type}
              </Tag>
            </div>
          </Space>
          <Space wrap>
            <DatePicker.RangePicker value={dateRange} onChange={setDateRange} style={{ width: 260 }} />
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadLedger(viewParty)}
              style={{ background: PRIMARY, border: 'none', color: '#fff', fontWeight: 600 }}
            >
              Download PDF
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ borderColor: PRIMARY, color: PRIMARY }}>
              Print
            </Button>
          </Space>
        </div>

        <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: `1px solid ${borderColor}` }}>
          <Row gutter={[16, 8]} wrap>
            {viewParty.phone && (
              <Col><Space size={4}><PhoneOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.phone}</Text></Space></Col>
            )}
            {viewParty.email && (
              <Col><Space size={4}><MailOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.email}</Text></Space></Col>
            )}
            {viewParty.address && (
              <Col><Space size={4}><EnvironmentOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.address}</Text></Space></Col>
            )}
            {viewParty.gst && (
              <Col><Space size={4}><FileTextOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>Lic/GST: {viewParty.gst}</Text></Space></Col>
            )}
          </Row>
        </div>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { label: isSupplier ? 'Total Purchases (Dr)' : 'Total Invoiced (Dr)', val: `₹${totalDebit.toLocaleString()}`, color: '#ff4d4f' },
            { label: isSupplier ? 'Total Paid (Cr)' : 'Total Received (Cr)', val: `₹${totalCredit.toLocaleString()}`, color: '#52c41a' },
            { label: 'Net Balance', val: `₹${Math.abs(netBalance).toLocaleString()}${netBalance < 0 ? ' (Adv)' : ''}`, color: PRIMARY },
          ].map(s => (
            <Col xs={8} key={s.label}>
              <Card style={{ borderRadius: 10, border: 'none', background: `${s.color}10` }} styles={{ body: { padding: '10px 14px' } }}>
                <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                <Text strong style={{ color: s.color, fontSize: 16 }}>{s.val}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Table
          size="small"
          dataSource={ledger}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No transactions in selected date range.' }}
          scroll={{ x: 750 }}
          columns={ledgerColumns}
          summary={(pageData) => {
            const pgDebit = pageData.reduce((s, r) => s + r.debit, 0);
            const pgCredit = pageData.reduce((s, r) => s + r.credit, 0);
            return (
              <Table.Summary.Row style={{ background: isDark ? '#1a1a2e' : '#fafafa', fontWeight: 700 }}>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong style={{ fontSize: FONT_SIZE }}>Page Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text style={{ color: '#ff4d4f', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgDebit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text style={{ color: '#52c41a', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgCredit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>
                    ₹{Math.abs(ledger.at(-1)?.balance ?? 0).toLocaleString()} Dr
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </div>
    );
  };

  const partiesTableColumns = (type) => [
    {
      title: type === 'Supplier' ? 'Supplier Name' : type === 'Customer' ? 'Customer Name' : 'Party Name',
      dataIndex: 'name',
      render: v => <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>{v}</Text>
    },
    {
      title: 'Type', dataIndex: 'type', width: 100,
      render: v => (
        <Tag style={{ borderRadius: 10, border: `1px solid ${PRIMARY}33`, background: `${PRIMARY}10`, color: PRIMARY, fontSize: FONT_SIZE - 1 }}>
          {v}
        </Tag>
      )
    },
    {
      title: 'Phone', dataIndex: 'phone', width: 160,
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: 'Address', dataIndex: 'address',
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: type === 'Supplier' ? 'Total Purchases' : type === 'Customer' ? 'Total Sales' : 'Total',
      key: 'total', align: 'right', width: 140,
      render: (_, r) => <Text strong style={{ fontSize: FONT_SIZE }}>₹{(r.totalPurchase || r.totalSales || 0).toLocaleString()}</Text>
    },
    {
      title: type === 'Supplier' ? 'Paid' : type === 'Customer' ? 'Received' : 'Paid / Received',
      key: 'paid', align: 'right', width: 130,
      render: (_, r) => <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{(r.paid || r.received || 0).toLocaleString()}</Text>
    },
    {
      title: 'Pending', dataIndex: 'pending', align: 'right', width: 120,
      render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
    },
    {
      title: 'Paid %', key: 'balance_bar', width: 110,
      render: (_, r) => {
        const total = r.totalPurchase || r.totalSales || 1;
        const paidVal = r.paid || r.received || 0;
        const pct = Math.min(100, Math.round((paidVal / total) * 100));
        return (
          <div>
            <div style={{ background: borderColor, borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#52c41a' : PRIMARY, borderRadius: 4 }} />
            </div>
            <Text style={{ fontSize: 11, color: '#888' }}>{pct}% paid</Text>
          </div>
        );
      }
    },
    {
      title: 'Action', key: 'action', fixed: 'right', width: isSuperAdmin ? 210 : 150,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={e => { e.stopPropagation(); setViewParty(r); }} style={{ color: PRIMARY, padding: '0 4px', fontSize: FONT_SIZE }}>
            Ledger
          </Button>
          <Button size="small" type="link" icon={<DownloadOutlined />} onClick={e => { e.stopPropagation(); downloadLedger(r); }} style={{ color: PRIMARY, padding: '0 4px', fontSize: FONT_SIZE }}>
            Download
          </Button>
          {isSuperAdmin && (
            <Button
              size="small"
              type="link"
              icon={<DeleteOutlined />}
              onClick={e => { e.stopPropagation(); deleteParty(r); }}
              style={{ color: '#ff4d4f', padding: '0 4px', fontSize: FONT_SIZE }}
            >
              Delete
            </Button>
          )}
        </Space>
      )
    }
  ];

  const renderPartiesTable = (parties, search, setSearch, type) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: FONT_SIZE }}>
          {type === 'Supplier' ? 'Purchase ledger per supplier' : 'Sales & invoice ledger per customer'} — click a row to view full transaction history
        </Text>
        <Input
          prefix={<SearchOutlined />}
          placeholder={`Search ${type.toLowerCase()}s...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220, borderRadius: 8 }}
          allowClear
        />
      </div>
      <Table
        size="small"
        dataSource={parties.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))}
        rowKey="key"
        pagination={{ pageSize: 8 }}
        scroll={{ x: 900 }}
        onRow={r => ({ onClick: () => setViewParty(r), style: { cursor: 'pointer' } })}
        columns={partiesTableColumns(type)}
      />
    </div>
  );

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Parties & Ledger" items={[{ label: 'Parties & Ledger' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Supplier Pending', value: `₹${totalSupplierPending.toLocaleString()}`, icon: <ShopOutlined />, sub: `${supplierList.filter(p => p.pending > 0).length} suppliers with dues` },
          { label: 'Supplier Paid', value: `₹${totalSupplierPaid.toLocaleString()}`, icon: <WalletOutlined />, sub: 'Total paid to suppliers' },
          { label: 'Customer Pending', value: `₹${totalCustomerPending.toLocaleString()}`, icon: <TeamOutlined />, sub: `${customerList.filter(p => p.pending > 0).length} customers with dues` },
          { label: 'Customer Received', value: `₹${totalCustomerReceived.toLocaleString()}`, icon: <ArrowUpOutlined />, sub: 'Total received from customers' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PRIMARY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: PRIMARY, fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                    <Text strong style={{ color: PRIMARY, fontSize: 18 }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: '8px 16px 16px' } }}
      >
        {viewParty ? renderPartyView() : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'all',
                label: <Space><BookOutlined /> All Parties</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Text type="secondary" style={{ fontSize: FONT_SIZE }}>All suppliers and customers in one view — click a row to view full transaction history</Text>
                      <Space wrap>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search all parties..."
                          value={allSearch}
                          onChange={e => setAllSearch(e.target.value)}
                          style={{ width: 220, borderRadius: 8 }}
                          allowClear
                        />
                        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 130 }}>
                          <Option value="all">All Types</Option>
                          <Option value="Supplier">Suppliers</Option>
                          <Option value="Customer">Customers</Option>
                        </Select>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      dataSource={allParties.filter(p =>
                        (typeFilter === 'all' || p.type === typeFilter) &&
                        (!allSearch || p.name.toLowerCase().includes(allSearch.toLowerCase()))
                      )}
                      rowKey="key"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 900 }}
                      onRow={r => ({ onClick: () => setViewParty(r), style: { cursor: 'pointer' } })}
                      columns={partiesTableColumns('all')}
                    />
                  </div>
                )
              },
              {
                key: 'suppliers',
                label: <Space><ShopOutlined /> Vendors Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(supplierList, supplierSearch, setSupplierSearch, 'Supplier')}
                  </div>
                )
              },
              {
                key: 'customers',
                label: <Space><TeamOutlined /> Customers Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(customerList, customerSearch, setCustomerSearch, 'Customer')}
                  </div>
                )
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
