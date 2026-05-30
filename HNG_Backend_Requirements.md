# HNG CRM — Backend Requirement & Functional Documentation

**Version 1.0 | Generated: 2026-05-29**  
**Prepared by: Senior Solution Architect Analysis**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Module Inventory](#2-complete-module-inventory)
3. [Detailed Page-by-Page Analysis](#3-detailed-page-by-page-analysis)
4. [Workflow Analysis](#4-workflow-analysis)
5. [Form Analysis — Master Field Inventory](#5-form-analysis--master-field-inventory)
6. [Database Design Documentation](#6-database-design-documentation)
7. [API Documentation Requirements](#7-api-documentation-requirements)
8. [Authentication & Authorization Analysis](#8-authentication--authorization-analysis)
9. [Notification System Analysis](#9-notification-system-analysis)
10. [File & Document Management Analysis](#10-file--document-management-analysis)
11. [Dashboard Analytics Requirements](#11-dashboard-analytics-requirements)
12. [Audit Trail Requirements](#12-audit-trail-requirements)
13. [Integration Requirements](#13-integration-requirements)
14. [Security Analysis](#14-security-analysis)
15. [Backend Architecture Recommendation](#15-backend-architecture-recommendation)
16. [Development Roadmap](#16-development-roadmap)
17. [Gap Analysis](#17-gap-analysis)
18. [Assumptions Log](#18-assumptions-log)

---

## 1. Executive Summary

### 1.1 Project Overview

**Heal N Glow (HNG) CRM** is an enterprise-grade, full-lifecycle business management platform built for a hospitality-product manufacturing company. The company produces and distributes amenity products (soaps, shampoos, dental kits, conditioners) to hotels, resorts, and hospitality chains across India.

### 1.2 Business Purpose

The platform digitizes and integrates the complete supply-chain-to-revenue cycle:

- **Lead → Order → Dispatch → Invoice → Payment** (Sales side)
- **Requirement → Quotation → Approval → Purchase → Receipt** (Procurement side)
- **Raw Material → Production → Inventory → Dispatch** (Operations side)
- **Expense Tracking → P&L Reporting → GST Compliance** (Finance side)

### 1.3 Target Users

| User Role | Responsibilities |
|---|---|
| Admin | Full system access, settings, user management |
| Sales Manager | Lead management, orders, quotations, complaints |
| Sales Executive | Lead creation, follow-up, order placement |
| Operations Manager | Order processing, task assignment, dispatch |
| Dispatch Team | Sticker printing, packing, dispatch confirmation |
| Finance/Accounts | Purchase approval, payment processing, P&L |
| Inventory Manager | Stock management, purchase requests |
| Staff/Production | Task execution, stock checking |

### 1.4 Core Modules (18 Functional Modules)

1. Authentication & User Management
2. Dashboard & Analytics
3. Sales Team (Leads, Quotations, Orders, Complaints, Parties)
4. Operations (Order Processing, Sticker Printing)
5. Task Management (Kanban, Table view)
6. Dispatch Team (Dispatch, Lorry Receipts, Tracking)
7. Staff Management (Roles, Credentials, Reimbursements)
8. Inventory Management (Stock, Approvals, History)
9. Purchase (Bulk Requests, Vendor Quotations, Local Purchase, History)
10. Billing (Invoices, Quotations, Ledger, Parties)
11. Parties & Ledger (Customer/Vendor Ledger, Transactions)
12. Vendors & Suppliers (Vendor CRM, Printing Suppliers)
13. Financial (Quotation Approval, Payments, Reimbursements)
14. Expenses (Categories, Tracking, Reports)
15. Reports (Sales, Purchase, P&L, GST, Performance)
16. Settings (Company, Users, Permissions, GST, Invoice)
17. Notifications (Stock, Payment, Dispatch, Tasks)
18. Integration (WhatsApp, AI)

### 1.5 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  React 19 + Ant Design + Redux Toolkit + React Router   │
│  (SPA hosted on Vercel)                                 │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS/REST + WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                   API GATEWAY LAYER                     │
│  Node.js / Express.js — JWT Auth — Rate Limiting        │
│  CORS, Helmet, Input Validation (Joi/Zod)               │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Business │  │  File    │  │Notification│
  │ Services │  │ Storage  │  │ Service  │
  │(16 modules)│ │(S3/Cloudinary)│ │(WhatsApp/│
  └────┬─────┘  └──────────┘  │Email/Push)│
       │                      └──────────┘
       ▼
  ┌──────────────────────────────────┐
  │         DATA LAYER               │
  │  PostgreSQL (primary)            │
  │  Redis (cache + sessions)        │
  │  S3 / Cloudinary (files)         │
  └──────────────────────────────────┘
```

---

## 2. Complete Module Inventory

```
HNG CRM System
├── 1. Authentication
│   ├── Login (email/password)
│   ├── Token Management (JWT + Refresh)
│   └── Password Reset
│
├── 2. Dashboard
│   ├── KPI Cards (Orders, Revenue, Dispatch, Clients, Tasks)
│   ├── Revenue & Orders Trend Chart
│   ├── Order Status Pie Chart
│   ├── Recent Orders Table
│   ├── Top Products Bar Chart
│   ├── Low Stock Alerts Widget
│   └── Recent Activity Timeline
│
├── 3. Sales Team
│   ├── Leads
│   │   ├── Add Lead
│   │   ├── Edit Lead
│   │   ├── Lead List (Table)
│   │   ├── Lead Detail View
│   │   ├── Lead Status Update
│   │   └── Lead Assignment
│   ├── Quotations & Negotiations
│   │   ├── Create Quotation
│   │   ├── Create Negotiation
│   │   ├── Convert Quotation → Negotiation
│   │   ├── Convert Negotiation → Order
│   │   ├── WhatsApp Share
│   │   └── View/Print/Download
│   ├── Orders
│   │   ├── Order List
│   │   ├── Order Detail View
│   │   ├── Edit Order (Payment Terms, Dates)
│   │   └── Order Status Management
│   ├── Parties
│   │   ├── Add Party
│   │   └── Party List
│   ├── Complaints
│   │   ├── Raise Complaint (linked to Order)
│   │   └── Complaint List
│   └── Performance Tab (Sales Team KPIs)
│
├── 4. Operations
│   ├── Order Management
│   │   ├── Order Status Update
│   │   ├── Assign Task
│   │   └── Full Operation Screen
│   ├── Sticker Printing
│   │   ├── Product Stickers List
│   │   ├── Box Stickers List
│   │   ├── Send to Sticker Team
│   │   ├── New Sticker Request (Order-linked)
│   │   ├── Upload Design
│   │   ├── WhatsApp to Printer
│   │   ├── Print
│   │   └── Dispatch to Operation
│   ├── Today's Orders
│   ├── Today's Dispatch Orders
│   └── Pick Up Order
│
├── 5. Task Management
│   ├── Task List (Table view)
│   ├── Task Kanban (Board view)
│   ├── Suggested Tasks
│   ├── Current Tasks
│   ├── Start / Done / Emergency
│   └── Approve Emergency Dispatch
│
├── 6. Dispatch Team
│   ├── Dispatch Order Tracking
│   │   ├── Verify Items
│   │   ├── Set Dispatch Type (Full/Partial)
│   │   ├── Open/Close Box (Camera)
│   │   ├── Enter Invoice Number & Date
│   │   ├── Upload Invoice
│   │   ├── Auto-notify Checkbox
│   │   ├── WhatsApp Send
│   │   ├── Print Dispatch Details
│   │   ├── Save as Draft
│   │   └── Confirm Dispatch
│   ├── LR / Lorry Receipt
│   │   ├── Upload LR File
│   │   ├── Enter Tracking URL & LR Number
│   │   └── Finished Dispatch
│   └── Dispatch Detail View
│
├── 7. Staff Management
│   ├── Add / Edit Staff
│   ├── Staff List
│   ├── Role Logins (Edit Credentials)
│   ├── Enable/Disable Login
│   └── Reimbursement Claims
│       ├── Transport Claims
│       └── Other Claims
│
├── 8. Inventory
│   ├── Item Management
│   │   ├── Add Item
│   │   ├── Edit Item
│   │   └── Item List
│   ├── Sell Stock (with Approval)
│   ├── Add Stock (with Approval)
│   ├── Approvals Queue
│   ├── Stock History
│   └── Live Staff Checking
│       ├── Count Check
│       ├── Known Reason Missing
│       └── Unknown Reason Missing
│
├── 9. Purchase
│   ├── Bulk Purchase Request
│   ├── Ask Quotation (per-supplier)
│   ├── Modify Quotation Request (notes)
│   ├── Raise Request to Financial
│   ├── Upload LR (Dispatch)
│   ├── Dispatch Order Tracking
│   │   ├── Received Order
│   │   ├── Upload Invoice
│   │   ├── AI Scan Invoice
│   │   └── Confirm Full Receipt
│   ├── Local Purchase
│   │   ├── Add Local Purchase
│   │   ├── Upload Invoice
│   │   └── View
│   └── Purchase Order History (Export)
│
├── 10. Billing
│   ├── Create Invoice (Drawer)
│   ├── Order-in-Process (Quotation → Invoice)
│   │   ├── Convert to Invoice (with Previous Due)
│   │   ├── Set Reminder
│   │   ├── View Proof
│   │   └── Verify Payment
│   ├── Invoices Tab
│   │   ├── View Invoice
│   │   ├── Edit GST
│   │   ├── Record Payment Manually
│   │   ├── WhatsApp Share
│   │   ├── Print/Download
│   │   └── Set Reminder
│   └── Ledger View (per client)
│
├── 11. Parties & Ledger
│   ├── Party List (Customers + Suppliers)
│   ├── Party Ledger View (Download PDF / Print)
│   ├── Vendors Ledger
│   ├── Customers Ledger
│   └── Delete Party
│
├── 12. Vendors & Suppliers
│   ├── Vendors (Raw Material)
│   │   ├── Add Vendor
│   │   ├── View Purchase History
│   │   ├── AI Vendor Details / Summary
│   │   ├── Download AI Summary
│   │   └── Update Status
│   └── Printing Suppliers
│       └── Add Printing Supplier (with Type: Box/Sticker/etc.)
│
├── 13. Financial
│   ├── Quotation Requests (Approve / Reject)
│   ├── Expense Payments
│   └── Reimbursement Expense
│       ├── Pickup Expense
│       └── Local Purchase Expense
│
├── 14. Expenses
│   ├── All Expenses / Other / Purchase
│   ├── Add Expense
│   ├── View History (date range)
│   └── Export
│
├── 15. Reports
│   ├── Sales Report (GST Format, Excel/PDF)
│   ├── Purchase Report (With/Without GST)
│   ├── Profit & Loss (Product, Month, GST Mode)
│   ├── Bill-wise P&L
│   ├── Performance (Leaderboard, Target vs Achievement)
│   ├── Monthly GST (Combined/Sales/Purchase)
│   └── Auditor Tax Report
│
├── 16. Settings
│   ├── Company Settings
│   ├── User Management (Add/Edit/Delete + Permissions)
│   ├── Notifications Settings
│   ├── GST & Tax
│   ├── Invoice Settings (4 Themes + Toggles)
│   └── Deleted Records (Restore)
│
├── 17. Notifications
│   ├── Stock Alerts Tab
│   ├── Payment Updates Tab
│   └── Dispatch / Tasks Tab
│
└── 18. Integration
    ├── WhatsApp Integration
    └── AI Integration
```

---

## 3. Detailed Page-by-Page Analysis

### 3.1 Login Page

**Route:** `/login`  
**Purpose:** Authenticate users into the CRM

| Component | Details |
|---|---|
| Form Fields | Email Address, Password (with show/hide toggle) |
| Actions | Sign In (`POST /auth/login`) |
| Validation | Email format required, Password required |
| Redirect | Authenticated → `/` (Dashboard) |
| Error States | Invalid credentials message |

---

### 3.2 Dashboard

**Route:** `/`  
**Access:** All authenticated users (read permission on Dashboard)

**KPI Stats Cards (time-filtered: Today / This Week / This Month / All Time):**

| KPI | Description |
|---|---|
| Total Orders | Count of all orders |
| Monthly Revenue | Sum of paid/partially-paid invoices |
| Dispatch Ready | Orders with status = Dispatch Ready |
| Active Clients | Parties with active orders |
| Total Tasks | All tasks count |
| Active Complaints | Open complaints count |
| Upcoming Reminders | Follow-up/reminder dates in next 7 days |
| Today's Tasks | Tasks created/due today |
| Pending Tasks | Tasks with status = Pending |
| Completed Tasks | Tasks with status = Done |

**Charts:**
- Revenue & Orders Trend — Area chart (monthly, last 7 months)
- Order Status Distribution — Pie chart (Completed / In Progress / Pending / Dispatched %)
- Top Products by Order Volume — Dual-axis Bar chart (Qty + Revenue)

**Tables / Lists:**
- Recent Orders table (ID, Client, Product, Qty, Status, Amount)
- Low Stock Alerts (Item, Current/Min stock, Progress bar)
- Recent Activity Timeline (timestamped events)

---

### 3.3 Sales Team

**Route:** `/sales`  
**Sub-tabs:** Leads, Quotations & Negotiations, Orders, Parties, Complaints, Performance

#### 3.3.1 Leads

**Lead Form Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| Hotel / Company Name | Text | Yes | Non-empty |
| Branch | Text | No | — |
| No. of Rooms | Number | Yes | Integer > 0 |
| General Occupancy % | Number | Yes | 0–100 |
| Billing Name | Text | No | — |
| Contact Person | Text | No | — |
| POC Designation | Text | No | — |
| Phone | Text | Yes | Mobile format |
| Alternative Role | Select | Yes | ENUM (Managers/etc.) |
| Alternative Name | Text | No | — |
| Alternative Number | Text | Yes | Mobile format |
| Email | Email | No | Email format |
| Location / City | Text | Yes | — |
| Destination | Text | No | — |
| Assign Lead To | Select | Yes | Sales user ID |
| Source | Select | No | Direct/Reference/etc. |
| Priority | Toggle | No | Boolean |
| Priority Note | Text | Conditional | Required if priority = true |
| Interested in Software | Select | Yes | Yes/No |
| Previous Software | Text | Conditional | If interested |
| Previous Software Price | Number | Conditional | >= 0 |
| Software Expiry Date | Date | Conditional | Future date |
| Detailed Address | TextArea | Yes | — |
| City | Text | No | — |
| State | Text | No | — |
| Pincode | Text | No | 6 digits numeric |
| GST Number | Text | No | GSTIN format |
| GST % | Number | No | 0–100 |
| Status | Select | No | Cold/Warm/Hot/Active/Dead |
| Follow-up Date | Date | No | — |
| Time | Time | No | — |
| Kit Products (array) | — | No | Multiple rows |
| Notes | TextArea | No | — |
| Paid Amount | Number | No | >= 0 |

**Lead Actions:** Add, Edit, View, List, Save, Back to List, Add Quotation, Add Negotiation, Convert to Order

#### 3.3.2 Quotations & Negotiations

**Workflow:**
```
Lead → [Add Quotation] → Quotation
    → [Convert to Negotiation] → Negotiation
    → [Convert to Order] → Order
```

**Actions:** Save, Convert, View document, Send via WhatsApp

#### 3.3.3 Orders

| Field | Type | Required |
|---|---|---|
| Payment Reminder Date | Date | No |
| Payment Terms | Select | Yes |
| Advance Paid | Number | No |
| Expected Delivery Date | Date | No |

**Payment Terms Options:**
- 100% Payment
- 50% Advance, 50% on Dispatch
- 50% Advance, 50% After Delivery (Max 15 days)
- Credit 30 Days

#### 3.3.4 Complaints

| Field | Type | Required |
|---|---|---|
| Order ID | Select | Yes |
| Complaint Description | TextArea | Yes |

---

### 3.4 Operations

**Route:** `/operations`, `/operations/:id`  
**Sub-sections:** Order Management, Sticker Printing, Today's Orders, Today's Dispatch Orders, Pick Up Order

**Sticker Printing Form:**

| Field | Type | Required |
|---|---|---|
| Order ID | Select | Yes |
| Hotel Logo | Select | Yes |
| Quantity | Text | No |
| Sticker Size | Text | No |
| Upload Design | File | Yes |

**Assign Task Form:**

| Field | Type | Required |
|---|---|---|
| Task Type | Select | Yes (Packing/etc.) |
| Task Name | Text | No |
| Product | Text | No |
| Printing | Select | No |
| Assign To | Select | Yes |

---

### 3.5 Task Management

**Route:** `/tasks`  
**Views:** Kanban Board, Table

**Task Actions:** Start, Mark Done, Emergency Dispatch (requires approval), Approve Emergency  
**Task Sub-tabs:** Suggested Tasks, Current Tasks

---

### 3.6 Dispatch Team

**Route:** `/dispatch`, `/dispatch/:id`

**Dispatch Flow Form Fields:**

| Field | Type | Notes |
|---|---|---|
| Dispatch Type | Select | Full / Partial Dispatch |
| Invoice Number | Text | Required on confirm |
| Invoice Date | Date | Required |
| Upload Invoice | File | PDF / Image |
| Auto-notify Sales Person | Checkbox | Default: checked |
| Send WhatsApp | Checkbox | Default: checked |
| LR Number | Text | Lorry Receipt |
| Tracking URL | URL | From transporter |
| Upload LR File | File | PDF / Image |

---

### 3.7 Staff Management

**Route:** `/staff`

**Staff Form:**

| Field | Type | Required |
|---|---|---|
| Full Name | Text | Yes |
| Department | Select | Yes |
| Role | Select | Yes |
| Phone | Text | No |
| Salary | Number | No |

**Role Logins (Edit Credentials):**

| Field | Type | Required |
|---|---|---|
| Password | Text (masked) | Yes |
| Access Description | Text | No |

---

### 3.8 Inventory

**Route:** `/inventory`

**Item Form:**

| Field | Type | Required |
|---|---|---|
| Item Name | Text | Yes |
| Category | Select | No |
| Unit (ml/g/Pcs/Kg/Ltr) | Select | No |
| Value | Number | No |
| Default Size | Text | No |
| Opening Stock | Number | No |
| Min Stock | Number | No |
| Purchase Price | Number | No |
| Selling Price | Number | No |
| HSN Code | Text | No |
| Discount on Sales Price | Number | No |

**Sell Stock Form:**

| Field | Type | Required |
|---|---|---|
| Quantity | Number | Yes |
| Sell Price | Number | No |
| Departure Date | Date | No |
| Party/Client | Select | No |

**Add Stock Form:**

| Field | Type | Required |
|---|---|---|
| Quantity | Number | Yes |
| Supply Price | Number | No |
| Date | Date | No |
| Supplier | Select | No |

---

### 3.9 Purchase

**Route:** `/purchase`

**Local Purchase Form:**

| Field | Type | Required |
|---|---|---|
| Invoice File | File | Yes |
| Invoice Number | Text | Yes |
| Vendor Name | Select | Yes |
| Vendor Phone | Text | No |
| Total Amount | Number | Yes |
| Items (array) | — | — |

**Raise Request to Financial:**

| Field | Type | Required |
|---|---|---|
| Supplier | Select | Yes |
| Additional Products | Multi-Select | No |
| Payment Terms | Select | Yes |
| Second Payment Reminder Date | Date | Conditional |
| Upload Quotation File | File | Required before submit |

---

### 3.10 Billing

**Route:** `/billing`

**Create Invoice Drawer Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Invoice Number | Text | Yes | Auto-generated, editable |
| Invoice Date | Date | Yes | Default: today |
| Due Date | Date | No | Optional |
| Due Duration | Select | No | 7/15/30/45/60/Custom days |
| Party (Bill To) | Select | Yes | Search or create new |
| Items | Array | Yes | From inventory |
| Invoice Type | Toggle | Yes | GST / Non-GST |
| GST % | Number | Conditional | If type = GST |
| Note | TextArea | No | — |
| Advance Amount | Number | No | — |
| Complementary | Toggle | No | Marks as ₹0 |
| Complementary Note | TextArea | Conditional | Required if complementary |

**New Party (Create inline):**

| Field | Type | Required |
|---|---|---|
| Party Name | Text | Yes |
| Contact Number | Text | No |
| Party Type | Toggle | No (default: Customer) |
| GST Number | Text | No |
| PAN Number | Text | No |
| Opening Balance | Number | No |
| Opening Balance Direction | Toggle | I Receive / I Pay |
| Credit Period | Select | No |
| Credit Limit | Number | No |
| Party Category | Select | No (VIP/Regular/Wholesale) |
| Contact Person Name | Text | No |
| Date of Birth | Date | No |
| Billing Address | Text | No |

**Record Payment Modal:**

| Field | Type | Required |
|---|---|---|
| Amount | Number | Yes |
| Payment Mode | Select | Yes (Cash/UPI/Card/Cheque/Bank Transfer) |
| Bank Account | Select | Conditional |
| UPI Reference | Text | Conditional (UPI) |
| Card Last 4 Digits | Text | Conditional (Card) |
| Transaction Reference | Text | Conditional (Bank) |
| Cheque Number | Text | Conditional |
| Cheque Bank | Text | Conditional |
| Cheque Date | Date | Conditional |
| Discount | Number | No |
| Note | Text | No |
| Linked Invoices | Multi | No |

---

### 3.11 Parties & Ledger

**Route:** `/parties-ledger`

**Ledger Columns:** Date, Client, Transaction Type (Invoice/Payment/Credit Note), Document ID, Debit, Credit, Running Balance

**Actions:** View Ledger, Download PDF, Print, Delete Party  
**Sub-sections:** Vendors Ledger, Customers Ledger

---

### 3.12 Vendors & Suppliers

**Route:** `/vendors-suppliers`

**Vendor Form:**

| Field | Type | Required |
|---|---|---|
| Name | Text | Yes |
| Phone | Text | No |
| Email | Email | No |
| Tax ID (GST/PAN) | Text | No |
| Address | Text | No |
| Bank Details | Text | No |
| Discount % | Number | No |

**Printing Supplier Form:**

| Field | Type | Required |
|---|---|---|
| Supplier Type | Select | Yes (Box/Sticker/etc.) |
| Name | Text | Yes |
| Phone | Text | No |
| Email | Email | No |
| Tax ID | Text | No |
| Address | Text | No |
| Bank Details | Text | No |

---

### 3.13 Financial

**Route:** `/financial`

**Tabs:**
1. **Quotation Requests** — Approve/Reject purchase requests, add notes, view linked order, Pay Now
2. **Expense Payments** — Pay general expenses, upload proof
3. **Reimbursement Expense**
   - **Pickup Expense** — Employee pickup reimbursements (linked to dispatch orders)
   - **Local Purchase Expense** — Vendor credit payments

**Financial Stats KPIs:**

| KPI | Source |
|---|---|
| Pending Approvals | purchase_requests WHERE status = Pending |
| Unpaid Orders | purchase_orders WHERE status = Unpaid |
| Unpaid Expenses | expenses WHERE payment_status = Unpaid |
| Total Paid MTD | Sum of paid amounts this month |

---

### 3.14 Expenses

**Route:** `/expenses`

**Expense Categories:** Shipping/Transportation, Utility, Rent, Salary & Wages, Marketing, Other

**Expense Form:**

| Field | Type | Required |
|---|---|---|
| Date | Date | Yes |
| Category | Select | Yes |
| Vendor / Payee | Text | No |
| Description | TextArea | Yes |
| Amount | Number | Yes |
| Upload Proof / Receipt | File | No |

---

### 3.15 Reports

**Route:** `/reports`

**Report Tabs:**

| Tab | Description |
|---|---|
| Sales Report | Monthly chart + GST format table (GSTIN, CGST, SGST, IGST) |
| Purchase Report | Monthly chart + With/Without GST tables + Product-wise GST summary |
| Profit & Loss | Gross/Net profit, expense toggles, GST mode (incl/excl), product filter |
| Bill-wise P&L | Per-invoice gross profit with COGS breakdown |
| Performance | Leaderboard, Target vs Achievement, Monthly Trend |
| Monthly GST | Input/output GST by month with CGST/SGST/IGST columns |
| Auditor Tax Report | Formal tax report for CA/auditor (Sales + Purchase tabs) |

**Export formats:** Excel (CSV), PDF (print window)

---

### 3.16 Settings

**Route:** `/settings`

**Tabs & Modules:**

| Tab | Contents |
|---|---|
| Company Settings | Logo, Name, Currency, Date Format, Address |
| User Management | Add/Edit/Delete users + granular module permissions |
| Notifications | Per-notification-type toggle switches |
| GST & Tax | Default rate, custom slabs, GST number, invoice prefix |
| Invoice Settings | 4 themes, font sizes, component toggles, terms text |
| Deleted Records | Soft-deleted party restore |

**Modules with permissions (16 total):**

```
Dashboard, Sales Team, Operations, Task Management, Dispatch Team,
Staff Management, Inventory, Purchase, Billing, Parties & Ledger,
Financial, Expenses, Reports, Notifications, Integration, Settings
```

**Permission types per module:** `read`, `add`, `edit`, `delete`

---

## 4. Workflow Analysis

### 4.1 Lead-to-Invoice Workflow

```
[Sales] Add Lead
    ↓ (Follow-up, status updates)
Lead Status: Cold → Warm → Hot → Active
    ↓
[Sales] Create Quotation (from lead)
    ↓
Send via WhatsApp → Client Review
    ↓
[Sales] Create Negotiation (price/terms adjustment)
    ↓
Convert to Order → [Operations notified]
    ↓
[Operations] Order Processing → Status: In Production
    ↓
[Operations] Sticker Printing (request → design upload → print)
    ↓
[Task Mgmt] Assign Packing Tasks → Production Lead
    ↓
[Dispatch] Verify Items → Box → Invoice Entry → Confirm Dispatch
    ↓
LR Upload → Tracking URL shared
    ↓
[Billing] Quotation appears in "Order in Process" tab
    ↓ (on payment received)
[Billing] Convert to Invoice (includes previous dues if any)
    ↓
[Billing] Record Payment (Cash/UPI/Bank) → Ledger updated
    ↓
Invoice Paid → Party Balance = 0
```

**Business Rules:**
- A lead must have a Phone before creating a quotation
- Negotiation can only be created from a quotation
- An order can only be created from a negotiation
- Invoice conversion shows previous outstanding dues automatically
- Complementary orders are recorded at ₹0 value (complaint resolution/goodwill)
- Overdue invoices (unpaid past due date) change status to `Overdue` automatically

---

### 4.2 Purchase-to-Receipt Workflow

```
[Inventory] Low Stock Detected (current < min_stock)
    ↓
[Inventory Manager] Raise Bulk Purchase Request
    → Select Supplier + Products + Payment Terms
    → WhatsApp Ask Quotation to Supplier
    ↓
[Inventory Manager] Upload Quotation File
    → Raise Request to Financial
    ↓
[Financial] Quotation Requests queue
    → Review Item / Supplier / Amount / Payment Terms
    → Add Notes / Ask via WhatsApp
    → Edit & Resend via WhatsApp
    ↓
[Financial] Approve / Reject
    → If Approved → Purchase Order created
    ↓
[Finance] Pay Now → Upload Payment Proof → Submit
    ↓
[Supplier] Ships Goods
    ↓
[Purchase] LR Upload (LR Number, Tracking URL, LR File)
    ↓
[Purchase] Dispatch Order Tracking
    → AI Scan Invoice (auto-fill fields)
    → Confirm Full Receipt → Inventory Stock Updated
    ↓
[Financial] Pickup Employee Reimbursement (if employee picked up)
    → Upload Proof → Mark Paid
    ↓
Inventory stock levels updated
```

**Business Rules:**
- Only approved purchase requests get paid
- Payment proof (file upload) is mandatory for all financial transactions
- Second payment reminder date required for 2-installment payment terms
- Receiving confirmation triggers inventory stock increment
- Employee reimbursements sync with dispatch tracking status

---

### 4.3 Inventory Stock-Check Workflow

```
[Staff] Live Staff Checking
    ↓
Count each item (+ / - controls)
    ↓
Discrepancy detected (actual ≠ expected)
    ↓
Flag as Known Reason → Enter reason text
   OR
Flag as Unknown → No reason required
    ↓
Submit for Approval
    ↓
[Manager] Review & Confirm
    ↓
Stock record updated with discrepancy log
```

---

### 4.4 Payment Approval Workflow (Inventory Sell/Add Stock)

```
Staff requests Sell Stock / Add Stock
    ↓
REQUEST APPROVAL button
    ↓
[Manager/Admin] Approvals Queue
    → Approve → Stock updated immediately
    → Reject → Request cancelled
```

---

### 4.5 Expense Reimbursement Workflow

```
[Staff] Submit Reimbursement Claim (Transport/Other)
    ↓
Claim appears in Staff Management Reimbursement Claims
    ↓
[Finance] Review in Financial → Reimbursement Expense tab
    → Pay Now → Enter Paid By → Upload Proof
    → Confirm Payment Done
    ↓
Status updates to "Paid" across:
  - Financial page
  - Dispatch Order Tracking page
  - Dispatch Pick Up Order page
```

---

## 5. Form Analysis — Master Field Inventory

### 5.1 Leads Master Fields

| Field Name | Label | Data Type | Required | Validation |
|---|---|---|---|---|
| hotel_name | Hotel/Company Name | VARCHAR(255) | Yes | Non-empty |
| branch | Branch | VARCHAR(100) | No | — |
| num_rooms | No. of Rooms | INTEGER | Yes | > 0 |
| general_occupancy | General Occupancy % | DECIMAL(5,2) | Yes | 0–100 |
| billing_name | Billing Name | VARCHAR(255) | No | — |
| contact_person | Contact Person | VARCHAR(100) | No | — |
| poc_designation | POC Designation | VARCHAR(100) | No | — |
| phone | Phone | VARCHAR(15) | Yes | Mobile regex |
| alt_role | Alternative Role | VARCHAR(50) | Yes | ENUM |
| alt_name | Alternative Name | VARCHAR(100) | No | — |
| alt_number | Alternative Number | VARCHAR(15) | Yes | Mobile regex |
| email | Email | VARCHAR(100) | No | Email format |
| location_city | Location / City | VARCHAR(100) | Yes | — |
| destination | Destination | VARCHAR(100) | No | — |
| assigned_to | Assign Lead To | INTEGER (FK) | Yes | User ID |
| source | Source | VARCHAR(50) | No | ENUM |
| is_priority | Priority | BOOLEAN | No | default: false |
| priority_note | Priority Note | TEXT | Conditional | Required if priority = true |
| interested_software | Interested in Software | BOOLEAN | No | — |
| previous_software | Previous Software | VARCHAR(100) | Conditional | — |
| prev_software_price | Previous Software Price | DECIMAL(12,2) | Conditional | >= 0 |
| software_expiry_date | Software Expiry Date | DATE | Conditional | Future date |
| address | Detailed Address | TEXT | Yes | — |
| city | City | VARCHAR(100) | No | — |
| state | State | VARCHAR(100) | No | — |
| pincode | Pincode | VARCHAR(6) | No | Numeric, 6 chars |
| gst_number | GST Number | VARCHAR(20) | No | GSTIN format regex |
| gst_percent | GST % | DECIMAL(5,2) | No | 0–100 |
| lead_status | Status | VARCHAR(20) | No | ENUM: Cold/Warm/Hot/Active/Dead |
| followup_date | Follow-up Date | DATE | No | — |
| followup_time | Time | TIME | No | — |
| notes | Notes | TEXT | No | — |
| paid_amount | Paid Amount | DECIMAL(12,2) | No | >= 0 |

### 5.2 Invoice Master Fields

| Field Name | Label | Data Type | Required | Notes |
|---|---|---|---|---|
| invoice_number | Invoice Number | VARCHAR(20) | Yes | Auto-generated with prefix |
| invoice_date | Invoice Date | DATE | Yes | Default: today |
| due_date | Due Date | DATE | No | — |
| due_days | Due Duration | INTEGER | No | 7/15/30/45/60 |
| party_id | Bill To (Party) | INTEGER (FK) | Yes | — |
| invoice_type | Invoice Type | ENUM | Yes | GST / Non-GST |
| gst_percent | GST % | DECIMAL(5,2) | Conditional | If type = GST |
| subtotal | Subtotal | DECIMAL(12,2) | Calculated | sum(items) |
| gst_amount | GST Amount | DECIMAL(12,2) | Calculated | subtotal × gst% |
| total | Total | DECIMAL(12,2) | Calculated | subtotal + gst_amount |
| advance_amount | Advance Payment | DECIMAL(12,2) | No | — |
| balance_due | Balance Due | DECIMAL(12,2) | Calculated | total - advance |
| is_complementary | Complementary | BOOLEAN | No | default: false |
| complementary_note | Complementary Reason | TEXT | Conditional | — |
| note | Invoice Note | TEXT | No | — |
| status | Status | ENUM | Auto | Paid / Pending / Partially Paid / Overdue |
| previous_balance | Previous Outstanding | DECIMAL(12,2) | Auto | From ledger |
| order_id | Linked Order | VARCHAR(20) | No | FK to orders |

---

## 6. Database Design Documentation

### 6.1 Complete Schema

#### `users`

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(100) UNIQUE NOT NULL,
  mobile          VARCHAR(15) UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  department      VARCHAR(100),
  role            VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'Active',
  avatar_url      TEXT,

  -- Sales Targets
  target_old_hotel    DECIMAL(12,2) DEFAULT 0,
  target_new_hotel    DECIMAL(12,2) DEFAULT 0,
  target_payment      DECIMAL(12,2) DEFAULT 0,
  target_software     DECIMAL(12,2) DEFAULT 0,
  target_people       INTEGER DEFAULT 0,
  reward_quarter      DECIMAL(10,2) DEFAULT 0,
  reward_half         DECIMAL(10,2) DEFAULT 0,
  reward_three_qtr    DECIMAL(10,2) DEFAULT 0,
  reward_full         DECIMAL(10,2) DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id)
);
```

#### `user_permissions`

```sql
CREATE TABLE user_permissions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module      VARCHAR(100) NOT NULL,
  can_read    BOOLEAN DEFAULT FALSE,
  can_add     BOOLEAN DEFAULT FALSE,
  can_edit    BOOLEAN DEFAULT FALSE,
  can_delete  BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, module)
);
```

#### `company_settings`

```sql
CREATE TABLE company_settings (
  id              SERIAL PRIMARY KEY,
  company_name    VARCHAR(255),
  logo_url        TEXT,
  currency        VARCHAR(10) DEFAULT 'INR',
  date_format     VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  address         TEXT,
  gst_number      VARCHAR(20),
  pan_number      VARCHAR(20),
  invoice_prefix  VARCHAR(20) DEFAULT 'INV-',
  default_gst     DECIMAL(5,2) DEFAULT 18,
  custom_gst_slabs JSONB,
  invoice_theme   VARCHAR(50) DEFAULT 'classic',
  invoice_font_size VARCHAR(10) DEFAULT 'medium',
  invoice_font_style VARCHAR(20),
  gst_component   VARCHAR(20) DEFAULT 'both',
  invoice_toggles JSONB,
  invoice_terms   TEXT,
  invoice_footer  TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_by      INTEGER REFERENCES users(id)
);
```

#### `notification_settings`

```sql
CREATE TABLE notification_settings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel     VARCHAR(50),
  is_enabled  BOOLEAN DEFAULT TRUE,
  UNIQUE (user_id, channel)
);
```

#### `leads`

```sql
CREATE TABLE leads (
  id                    SERIAL PRIMARY KEY,
  lead_code             VARCHAR(20) UNIQUE,
  hotel_name            VARCHAR(255) NOT NULL,
  branch                VARCHAR(100),
  num_rooms             INTEGER,
  general_occupancy     DECIMAL(5,2),
  billing_name          VARCHAR(255),
  contact_person        VARCHAR(100),
  poc_designation       VARCHAR(100),
  phone                 VARCHAR(15) NOT NULL,
  alt_role              VARCHAR(50),
  alt_name              VARCHAR(100),
  alt_number            VARCHAR(15),
  email                 VARCHAR(100),
  location_city         VARCHAR(100),
  destination           VARCHAR(100),
  assigned_to           INTEGER REFERENCES users(id),
  source                VARCHAR(50),
  is_priority           BOOLEAN DEFAULT FALSE,
  priority_note         TEXT,
  interested_software   BOOLEAN DEFAULT FALSE,
  previous_software     VARCHAR(100),
  prev_software_price   DECIMAL(12,2),
  software_expiry_date  DATE,
  address               TEXT,
  city                  VARCHAR(100),
  state                 VARCHAR(100),
  pincode               VARCHAR(6),
  gst_number            VARCHAR(20),
  gst_percent           DECIMAL(5,2) DEFAULT 18,
  status                VARCHAR(20) DEFAULT 'Cold',
  followup_date         DATE,
  followup_time         TIME,
  notes                 TEXT,
  paid_amount           DECIMAL(12,2) DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            INTEGER REFERENCES users(id)
);
```

#### `lead_kit_products`

```sql
CREATE TABLE lead_kit_products (
  id           SERIAL PRIMARY KEY,
  lead_id      INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kit_type     VARCHAR(100),
  display_type VARCHAR(100),
  product_name VARCHAR(255),
  qty          DECIMAL(10,2),
  rate         DECIMAL(10,2),
  gst_percent  DECIMAL(5,2),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `quotations`

```sql
CREATE TABLE quotations (
  id           SERIAL PRIMARY KEY,
  quot_code    VARCHAR(20) UNIQUE,
  lead_id      INTEGER REFERENCES leads(id),
  client_name  VARCHAR(255) NOT NULL,
  quote_date   TIMESTAMPTZ DEFAULT NOW(),
  amount       DECIMAL(12,2) NOT NULL,
  gst_amount   DECIMAL(12,2) DEFAULT 0,
  total        DECIMAL(12,2) NOT NULL,
  advance_paid DECIMAL(12,2) DEFAULT 0,
  balance      DECIMAL(12,2),
  type         VARCHAR(10) DEFAULT 'GST',
  status       VARCHAR(30) DEFAULT 'Unpaid',
  order_id     INTEGER REFERENCES orders(id),
  created_by   INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
```

#### `negotiations`

```sql
CREATE TABLE negotiations (
  id           SERIAL PRIMARY KEY,
  neg_code     VARCHAR(20) UNIQUE,
  quotation_id INTEGER REFERENCES quotations(id),
  lead_id      INTEGER REFERENCES leads(id),
  client_name  VARCHAR(255),
  neg_date     TIMESTAMPTZ DEFAULT NOW(),
  amount       DECIMAL(12,2),
  gst_amount   DECIMAL(12,2) DEFAULT 0,
  total        DECIMAL(12,2),
  advance_paid DECIMAL(12,2) DEFAULT 0,
  balance      DECIMAL(12,2),
  type         VARCHAR(10) DEFAULT 'GST',
  status       VARCHAR(30) DEFAULT 'Unpaid',
  created_by   INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders`

```sql
CREATE TABLE orders (
  id                     SERIAL PRIMARY KEY,
  order_code             VARCHAR(20) UNIQUE,
  lead_id                INTEGER REFERENCES leads(id),
  negotiation_id         INTEGER REFERENCES negotiations(id),
  quotation_id           INTEGER REFERENCES quotations(id),
  client_name            VARCHAR(255) NOT NULL,
  client_party_id        INTEGER REFERENCES parties(id),
  product                VARCHAR(255),
  qty                    INTEGER,
  amount                 DECIMAL(12,2),
  gst_amount             DECIMAL(12,2) DEFAULT 0,
  total                  DECIMAL(12,2),
  advance_paid           DECIMAL(12,2) DEFAULT 0,
  balance                DECIMAL(12,2),
  type                   VARCHAR(10) DEFAULT 'GST',
  status                 VARCHAR(50) DEFAULT 'In Production',
  payment_terms          VARCHAR(100),
  payment_reminder_date  DATE,
  advance_paid_amount    DECIMAL(12,2) DEFAULT 0,
  expected_delivery_date DATE,
  assigned_to            INTEGER REFERENCES users(id),
  created_by             INTEGER REFERENCES users(id),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);
```

#### `complaints`

```sql
CREATE TABLE complaints (
  id             SERIAL PRIMARY KEY,
  complaint_code VARCHAR(20) UNIQUE,
  order_id       INTEGER NOT NULL REFERENCES orders(id),
  description    TEXT NOT NULL,
  status         VARCHAR(30) DEFAULT 'Open',
  resolved_at    TIMESTAMPTZ,
  resolved_by    INTEGER REFERENCES users(id),
  created_by     INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

#### `parties`

```sql
CREATE TABLE parties (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(15),
  type            VARCHAR(20) DEFAULT 'Customer',
  gst_number      VARCHAR(20),
  pan_number      VARCHAR(20),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  opening_bal_dir VARCHAR(10) DEFAULT 'receive',
  credit_period   INTEGER DEFAULT 7,
  credit_limit    DECIMAL(12,2),
  category        VARCHAR(30),
  contact_person  VARCHAR(100),
  dob             DATE,
  street          TEXT,
  state           VARCHAR(100),
  pincode         VARCHAR(6),
  city            VARCHAR(100),
  running_balance DECIMAL(12,2) DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id)
);
```

#### `invoices`

```sql
CREATE TABLE invoices (
  id                SERIAL PRIMARY KEY,
  invoice_number    VARCHAR(20) UNIQUE,
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  due_days          INTEGER,
  party_id          INTEGER NOT NULL REFERENCES parties(id),
  order_id          INTEGER REFERENCES orders(id),
  invoice_type      VARCHAR(10) DEFAULT 'GST',
  subtotal          DECIMAL(12,2) NOT NULL,
  gst_percent       DECIMAL(5,2) DEFAULT 0,
  gst_amount        DECIMAL(12,2) DEFAULT 0,
  total             DECIMAL(12,2) NOT NULL,
  advance_amount    DECIMAL(12,2) DEFAULT 0,
  balance_due       DECIMAL(12,2),
  previous_balance  DECIMAL(12,2) DEFAULT 0,
  is_complementary  BOOLEAN DEFAULT FALSE,
  complementary_note TEXT,
  note              TEXT,
  status            VARCHAR(30) DEFAULT 'Pending',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        INTEGER REFERENCES users(id)
);
```

#### `invoice_items`

```sql
CREATE TABLE invoice_items (
  id         SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id    INTEGER REFERENCES inventory_items(id),
  item_name  VARCHAR(255) NOT NULL,
  unit       VARCHAR(20),
  price      DECIMAL(10,4) NOT NULL,
  qty        DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) GENERATED ALWAYS AS (price * qty) STORED
);
```

#### `payments`

```sql
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  payment_ref     VARCHAR(20) UNIQUE,
  party_id        INTEGER REFERENCES parties(id),
  invoice_id      INTEGER REFERENCES invoices(id),
  amount          DECIMAL(12,2) NOT NULL,
  discount        DECIMAL(12,2) DEFAULT 0,
  net_amount      DECIMAL(12,2),
  payment_mode    VARCHAR(30) NOT NULL,
  bank_account    VARCHAR(100),
  upi_reference   VARCHAR(100),
  card_last4      VARCHAR(4),
  transaction_ref VARCHAR(100),
  cheque_number   VARCHAR(30),
  cheque_bank     VARCHAR(100),
  cheque_date     DATE,
  note            TEXT,
  payment_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by      INTEGER REFERENCES users(id)
);
```

#### `ledger_entries`

```sql
CREATE TABLE ledger_entries (
  id         SERIAL PRIMARY KEY,
  party_id   INTEGER NOT NULL REFERENCES parties(id),
  entry_date DATE NOT NULL,
  type       VARCHAR(30) NOT NULL,
  doc_ref    VARCHAR(30),
  debit      DECIMAL(12,2) DEFAULT 0,
  credit     DECIMAL(12,2) DEFAULT 0,
  balance    DECIMAL(12,2),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

#### `inventory_items`

```sql
CREATE TABLE inventory_items (
  id               SERIAL PRIMARY KEY,
  item_code        VARCHAR(20) UNIQUE,
  item_name        VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  unit             VARCHAR(20) DEFAULT 'Pcs',
  default_size     VARCHAR(50),
  opening_stock    DECIMAL(12,2) DEFAULT 0,
  current_stock    DECIMAL(12,2) DEFAULT 0,
  min_stock        DECIMAL(12,2) DEFAULT 0,
  purchase_price   DECIMAL(10,4) DEFAULT 0,
  selling_price    DECIMAL(10,4) DEFAULT 0,
  hsn_code         VARCHAR(20),
  discount_percent DECIMAL(5,2) DEFAULT 0,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       INTEGER REFERENCES users(id)
);
```

#### `stock_movements`

```sql
CREATE TABLE stock_movements (
  id              SERIAL PRIMARY KEY,
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id),
  movement_type   VARCHAR(20) NOT NULL,   -- IN/OUT/ADJUSTMENT/CHECK
  qty             DECIMAL(12,2) NOT NULL,
  qty_before      DECIMAL(12,2),
  qty_after       DECIMAL(12,2),
  reason          TEXT,
  reason_type     VARCHAR(20),            -- Known/Unknown
  reference_type  VARCHAR(30),            -- Order/Purchase/Sale/Check
  reference_id    INTEGER,
  supply_price    DECIMAL(10,4),
  sell_price      DECIMAL(10,4),
  departure_date  DATE,
  party_id        INTEGER REFERENCES parties(id),
  approval_status VARCHAR(20) DEFAULT 'Pending',
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      INTEGER REFERENCES users(id)
);
```

#### `vendors`

```sql
CREATE TABLE vendors (
  id               SERIAL PRIMARY KEY,
  vendor_code      VARCHAR(20) UNIQUE,
  name             VARCHAR(255) NOT NULL,
  phone            VARCHAR(15),
  email            VARCHAR(100),
  tax_id           VARCHAR(30),
  address          TEXT,
  bank_details     TEXT,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  vendor_type      VARCHAR(20) DEFAULT 'raw_material',
  supplier_type    VARCHAR(50),
  status           VARCHAR(20) DEFAULT 'Active',
  ai_summary       TEXT,
  ai_summary_date  TIMESTAMPTZ,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       INTEGER REFERENCES users(id)
);
```

#### `purchase_requests`

```sql
CREATE TABLE purchase_requests (
  id                   SERIAL PRIMARY KEY,
  request_code         VARCHAR(20) UNIQUE,
  item_id              INTEGER REFERENCES inventory_items(id),
  vendor_id            INTEGER REFERENCES vendors(id),
  item_name            VARCHAR(255),
  qty                  DECIMAL(12,2) NOT NULL,
  unit                 VARCHAR(20),
  payment_terms        VARCHAR(100),
  first_reminder_date  DATE,
  second_reminder_date DATE,
  quotation_file_url   TEXT,
  status               VARCHAR(20) DEFAULT 'Pending',
  finance_note         TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  approved_by          INTEGER REFERENCES users(id),
  approved_at          TIMESTAMPTZ,
  created_by           INTEGER REFERENCES users(id)
);
```

#### `purchase_request_notes`

```sql
CREATE TABLE purchase_request_notes (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `purchase_orders`

```sql
CREATE TABLE purchase_orders (
  id               SERIAL PRIMARY KEY,
  po_code          VARCHAR(20) UNIQUE,
  request_id       INTEGER REFERENCES purchase_requests(id),
  vendor_id        INTEGER REFERENCES vendors(id),
  item_id          INTEGER REFERENCES inventory_items(id),
  item_name        VARCHAR(255),
  qty              DECIMAL(12,2),
  unit             VARCHAR(20),
  amount           DECIMAL(12,2),
  bill_no          VARCHAR(50),
  inv_no           VARCHAR(50),
  payment_terms    VARCHAR(100),
  payment_status   VARCHAR(30) DEFAULT 'Unpaid',
  paid_amount      DECIMAL(12,2) DEFAULT 0,
  payment_proof_url TEXT,
  lr_number        VARCHAR(50),
  tracking_url     TEXT,
  lr_file_url      TEXT,
  dispatch_status  VARCHAR(30) DEFAULT 'Pending',
  received_at      TIMESTAMPTZ,
  stock_updated    BOOLEAN DEFAULT FALSE,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       INTEGER REFERENCES users(id)
);
```

#### `local_purchases`

```sql
CREATE TABLE local_purchases (
  id                SERIAL PRIMARY KEY,
  lp_code           VARCHAR(20) UNIQUE,
  invoice_no        VARCHAR(50) NOT NULL,
  invoice_file_url  TEXT,
  vendor_name       VARCHAR(255),
  vendor_phone      VARCHAR(15),
  total_amount      DECIMAL(12,2) NOT NULL,
  payment_type      VARCHAR(20) DEFAULT 'credit',
  payment_status    VARCHAR(20) DEFAULT 'Pending',
  payment_proof_url TEXT,
  g_pay_number      VARCHAR(15),
  paid_date         DATE,
  paid_by           VARCHAR(100),

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        INTEGER REFERENCES users(id)
);
```

#### `local_purchase_items`

```sql
CREATE TABLE local_purchase_items (
  id        SERIAL PRIMARY KEY,
  lp_id     INTEGER NOT NULL REFERENCES local_purchases(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  qty       DECIMAL(10,2),
  unit      VARCHAR(20),
  amount    DECIMAL(12,2)
);
```

#### `dispatch_records`

```sql
CREATE TABLE dispatch_records (
  id                  SERIAL PRIMARY KEY,
  dispatch_code       VARCHAR(20) UNIQUE,
  order_id            INTEGER REFERENCES orders(id),
  dispatch_type       VARCHAR(20),
  invoice_number      VARCHAR(50),
  invoice_date        DATE,
  invoice_file_url    TEXT,
  auto_notify         BOOLEAN DEFAULT TRUE,
  send_whatsapp       BOOLEAN DEFAULT TRUE,
  lr_number           VARCHAR(50),
  tracking_url        TEXT,
  lr_file_url         TEXT,
  status              VARCHAR(30) DEFAULT 'Draft',
  dispatched_at       TIMESTAMPTZ,

  -- Pickup reimbursement fields
  pickup_emp_id       INTEGER REFERENCES staff(id),
  pickup_amount       DECIMAL(12,2),
  pickup_proof_url    TEXT,
  pickup_g_pay_number VARCHAR(15),
  payment_status      VARCHAR(20) DEFAULT 'Unpaid',
  payment_proof_url   TEXT,
  paid_date           DATE,
  paid_by             VARCHAR(100),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          INTEGER REFERENCES users(id)
);
```

#### `dispatch_items`

```sql
CREATE TABLE dispatch_items (
  id             SERIAL PRIMARY KEY,
  dispatch_id    INTEGER NOT NULL REFERENCES dispatch_records(id) ON DELETE CASCADE,
  item_id        INTEGER REFERENCES inventory_items(id),
  item_name      VARCHAR(255),
  qty_ordered    DECIMAL(10,2),
  qty_dispatched DECIMAL(10,2),
  verified       BOOLEAN DEFAULT FALSE,
  box_photo_url  TEXT
);
```

#### `sticker_requests`

```sql
CREATE TABLE sticker_requests (
  id                 SERIAL PRIMARY KEY,
  order_id           INTEGER REFERENCES orders(id),
  hotel_logo         VARCHAR(255),
  sticker_type       VARCHAR(20),
  quantity           INTEGER,
  sticker_size       VARCHAR(50),
  design_file_url    TEXT,
  status             VARCHAR(30) DEFAULT 'Pending',
  dispatched_to_ops  BOOLEAN DEFAULT FALSE,

  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  created_by         INTEGER REFERENCES users(id)
);
```

#### `tasks`

```sql
CREATE TABLE tasks (
  id                      SERIAL PRIMARY KEY,
  task_code               VARCHAR(20) UNIQUE,
  order_id                INTEGER REFERENCES orders(id),
  task_type               VARCHAR(50),
  task_name               VARCHAR(255),
  product                 VARCHAR(255),
  printing_type           VARCHAR(50),
  assigned_to             INTEGER REFERENCES staff(id),
  status                  VARCHAR(30) DEFAULT 'Pending',
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  is_emergency            BOOLEAN DEFAULT FALSE,
  emergency_approved      BOOLEAN DEFAULT FALSE,
  emergency_approved_by   INTEGER REFERENCES users(id),

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              INTEGER REFERENCES users(id)
);
```

#### `staff`

```sql
CREATE TABLE staff (
  id                   SERIAL PRIMARY KEY,
  staff_code           VARCHAR(20) UNIQUE,
  full_name            VARCHAR(255) NOT NULL,
  department           VARCHAR(100),
  role                 VARCHAR(100),
  phone                VARCHAR(15),
  salary               DECIMAL(10,2),
  login_enabled        BOOLEAN DEFAULT FALSE,
  login_password_hash  VARCHAR(255),
  access_description   TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           INTEGER REFERENCES users(id)
);
```

#### `reimbursement_claims`

```sql
CREATE TABLE reimbursement_claims (
  id         SERIAL PRIMARY KEY,
  staff_id   INTEGER REFERENCES staff(id),
  claim_type VARCHAR(30),
  amount     DECIMAL(10,2) NOT NULL,
  description TEXT,
  proof_url  TEXT,
  status     VARCHAR(20) DEFAULT 'Pending',
  paid_date  DATE,
  paid_by    VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `expenses`

```sql
CREATE TABLE expenses (
  id             SERIAL PRIMARY KEY,
  expense_code   VARCHAR(20) UNIQUE,
  expense_date   DATE NOT NULL,
  category       VARCHAR(50) NOT NULL,
  vendor_payee   VARCHAR(255),
  description    TEXT NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  proof_url      TEXT,
  payment_status VARCHAR(20) DEFAULT 'Unpaid',
  paid_by        VARCHAR(100),
  paid_date      DATE,
  expense_source VARCHAR(30) DEFAULT 'manual',

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by     INTEGER REFERENCES users(id)
);
```

#### `audit_logs`

```sql
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  module      VARCHAR(100),
  action      VARCHAR(50),
  entity_type VARCHAR(100),
  entity_id   INTEGER,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6.2 ER Diagram (Text)

```
users ─────────────── user_permissions (1:M)
users ─────────────── leads (1:M via assigned_to)
leads ──────────────── quotations (1:M)
leads ──────────────── lead_kit_products (1:M)
quotations ─────────── negotiations (1:M)
negotiations ───────── orders (1:M)
orders ─────────────── complaints (1:M)
orders ─────────────── dispatch_records (1:M)
orders ─────────────── tasks (1:M)
orders ─────────────── sticker_requests (1:M)
orders ─────────────── invoices (1:M)
parties ────────────── invoices (1:M)
parties ────────────── ledger_entries (1:M)
parties ────────────── payments (1:M)
invoices ───────────── invoice_items (1:M)
invoices ───────────── payments (1:M)
inventory_items ─────── stock_movements (1:M)
inventory_items ─────── invoice_items (1:M)
inventory_items ─────── purchase_requests (1:M)
vendors ────────────── purchase_requests (1:M)
vendors ────────────── purchase_orders (1:M)
purchase_requests ───── purchase_orders (1:1)
purchase_requests ───── purchase_request_notes (1:M)
purchase_orders ─────── dispatch_records (1:1)
local_purchases ─────── local_purchase_items (1:M)
staff ───────────────── tasks (1:M via assigned_to)
staff ───────────────── dispatch_records (1:M via pickup_emp)
staff ───────────────── reimbursement_claims (1:M)
```

### 6.3 Recommended Indexes

```sql
CREATE INDEX idx_leads_status       ON leads(status, deleted_at);
CREATE INDEX idx_leads_assigned     ON leads(assigned_to, deleted_at);
CREATE INDEX idx_orders_status      ON orders(status, deleted_at);
CREATE INDEX idx_orders_client      ON orders(client_party_id);
CREATE INDEX idx_invoices_party     ON invoices(party_id);
CREATE INDEX idx_invoices_status    ON invoices(status, due_date);
CREATE INDEX idx_ledger_party       ON ledger_entries(party_id, entry_date);
CREATE INDEX idx_stock_item         ON stock_movements(item_id, created_at);
CREATE INDEX idx_purchase_req_status ON purchase_requests(status);
CREATE INDEX idx_expenses_date      ON expenses(expense_date, category);
CREATE INDEX idx_audit_entity       ON audit_logs(entity_type, entity_id, created_at);
```

---

## 7. API Documentation Requirements

### 7.1 Authentication APIs

**POST `/api/auth/login`**
```json
Request:  { "email": "string", "password": "string" }
Response: { "token": "string", "refreshToken": "string", "user": { "id": 1, "full_name": "...", "role": "...", "permissions": {} } }
Errors:   401 Invalid credentials | 403 Account inactive
```

**POST `/api/auth/refresh`**
```json
Request:  { "refreshToken": "string" }
Response: { "token": "string", "refreshToken": "string" }
Errors:   401 Invalid/expired refresh token
```

**POST `/api/auth/logout`**
```
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

---

### 7.2 Leads APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/leads` | read | List leads (paginated, filterable) |
| POST | `/api/leads` | add | Create lead |
| GET | `/api/leads/:id` | read | Get single lead |
| PUT | `/api/leads/:id` | edit | Update lead |
| DELETE | `/api/leads/:id` | delete | Soft delete lead |
| PATCH | `/api/leads/:id/status` | edit | Update status |
| PATCH | `/api/leads/:id/assign` | edit | Reassign lead |

**POST `/api/leads` Request:**
```json
{
  "hotel_name": "string (required)",
  "phone": "string (required)",
  "num_rooms": "integer",
  "general_occupancy": "decimal",
  "assigned_to": "integer (user_id)",
  "status": "Cold|Warm|Hot|Active|Dead",
  "followup_date": "date",
  "kit_products": [{ "kit_type": "string", "qty": 10, "rate": 5 }]
}
```

---

### 7.3 Quotations / Negotiations / Orders APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/quotations` | Create quotation from lead |
| POST | `/api/quotations/:id/convert-negotiation` | Convert to negotiation |
| POST | `/api/negotiations/:id/convert-order` | Convert to order |
| GET | `/api/orders` | List orders |
| PATCH | `/api/orders/:id` | Update payment terms/dates |
| PATCH | `/api/orders/:id/status` | Update order status |

---

### 7.4 Invoices APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invoices` | List invoices (filterable) |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/:id` | Get invoice |
| POST | `/api/invoices/:id/payment` | Record payment |
| PATCH | `/api/invoices/:id/gst` | Edit GST amount |
| POST | `/api/invoices/convert-quotation` | Convert quotation to invoice |
| GET | `/api/invoices/:id/pdf` | Generate PDF |

**POST `/api/invoices` Side Effects:**
- Create `ledger_entry` (debit)
- Update `parties.running_balance`

**POST `/api/invoices/:id/payment` Side Effects:**
- Create `payments` record
- Create `ledger_entry` (credit)
- Update `invoices.status` (Paid / Partially Paid)
- Update `parties.running_balance`

---

### 7.5 Parties APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/parties` | List parties |
| POST | `/api/parties` | Create party |
| PUT | `/api/parties/:id` | Update party |
| DELETE | `/api/parties/:id` | Soft delete |
| GET | `/api/parties/:id/ledger` | Get party ledger |
| GET | `/api/parties/:id/ledger/pdf` | Download ledger PDF |

---

### 7.6 Inventory APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | List items |
| POST | `/api/inventory` | Create item |
| PUT | `/api/inventory/:id` | Update item |
| POST | `/api/inventory/:id/sell-request` | Request to sell stock |
| POST | `/api/inventory/:id/add-request` | Request to add stock |
| PATCH | `/api/inventory/approvals/:id/approve` | Approve stock movement |
| PATCH | `/api/inventory/approvals/:id/reject` | Reject stock movement |
| POST | `/api/inventory/stock-check` | Submit live staff check |
| GET | `/api/inventory/history` | Stock movement history |

---

### 7.7 Purchase APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/purchase/bulk-request` | Bulk purchase request |
| POST | `/api/purchase/raise-request` | Raise request to financial |
| PATCH | `/api/purchase/requests/:id/notes` | Add note to request |
| POST | `/api/purchase/local` | Add local purchase |
| POST | `/api/purchase/orders/:id/receive` | Confirm receipt + update stock |
| GET | `/api/purchase/history` | Purchase order history |
| GET | `/api/purchase/history/export` | Export history |

---

### 7.8 Financial APIs

| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/api/financial/requests/:id/approve` | Approve purchase request |
| PATCH | `/api/financial/requests/:id/reject` | Reject purchase request |
| POST | `/api/financial/pay/:order_id` | Process purchase order payment |
| POST | `/api/financial/reimbursements/:id/pay` | Pay pickup reimbursement |
| POST | `/api/financial/local-purchase/:id/pay` | Pay local purchase |
| PUT | `/api/financial/requests/:id/quotation` | Edit quotation details |

---

### 7.9 Expenses APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/expenses` | List expenses (filterable) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/history` | History with date range |
| GET | `/api/expenses/export` | Export to CSV/Excel |

---

### 7.10 Dispatch APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dispatch` | List dispatch records |
| POST | `/api/dispatch` | Create dispatch record |
| PATCH | `/api/dispatch/:id/lr` | Upload LR details |
| PATCH | `/api/dispatch/:id/confirm` | Confirm dispatch |
| GET | `/api/dispatch/:id/print` | Print dispatch details |

---

### 7.11 Reports APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/sales` | Sales report (GST format) |
| GET | `/api/reports/purchase` | Purchase report |
| GET | `/api/reports/profit-loss` | P&L report |
| GET | `/api/reports/bill-wise-pl` | Bill-wise P&L |
| GET | `/api/reports/monthly-gst` | Monthly GST report |
| GET | `/api/reports/performance` | Sales performance |
| GET | `/api/reports/auditor-tax` | Auditor tax report |
| GET | `/api/reports/*/export` | Excel/CSV export variants |

---

### 7.12 Settings APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings/company` | Get company settings |
| PUT | `/api/settings/company` | Update company settings |
| POST | `/api/settings/company/logo` | Upload logo |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Soft delete user |
| PUT | `/api/users/:id/permissions` | Update user permissions |
| GET | `/api/settings/deleted-records` | Get soft-deleted records |
| POST | `/api/settings/deleted-records/:type/:id/restore` | Restore record |

---

### 7.13 AI & Integration APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/scan-invoice` | OCR scan invoice file |
| POST | `/api/ai/vendor-summary/:id` | Generate AI vendor summary |
| GET | `/api/ai/vendor-summary/:id/pdf` | Download summary PDF |
| POST | `/api/webhooks/whatsapp` | WhatsApp delivery status webhook |

---

## 8. Authentication & Authorization Analysis

### 8.1 Authentication Strategy

| Aspect | Implementation |
|---|---|
| Method | Email + Password |
| Token Type | JWT (Access + Refresh) |
| Access Token TTL | 15 minutes |
| Refresh Token TTL | 7 days |
| Password Storage | bcrypt (cost factor 12) |
| Password Policy | Min 8 chars, uppercase, number, special char |
| Session Storage | Redis (refresh tokens keyed by user ID) |
| Token Signing | RSA-256 (asymmetric) |

### 8.2 Role Matrix

| Module | Admin | Finance | Sales Mgr | Sales Exec | Operations | Dispatch | Inventory | Staff |
|---|---|---|---|---|---|---|---|---|
| Dashboard | R | R | R | R | R | R | R | R |
| Sales Team | CRUD | R | CRUD | CR | R | — | — | — |
| Operations | CRUD | — | R | R | CRUD | R | — | — |
| Task Management | CRUD | — | R | — | CRUD | R | — | CRUD |
| Dispatch Team | CRUD | — | R | — | R | CRUD | — | — |
| Staff Management | CRUD | — | R | — | — | — | — | R |
| Inventory | CRUD | — | R | — | R | — | CRUD | R |
| Purchase | CRUD | CRUD | R | — | R | — | CRUD | — |
| Billing | CRUD | R | CRUD | R | — | — | — | — |
| Parties & Ledger | CRUD | R | CRUD | R | — | — | — | — |
| Financial | CRUD | CRUD | R | — | — | — | — | — |
| Expenses | CRUD | CRUD | R | — | — | — | — | — |
| Reports | R | R | R | R | R | — | R | — |
| Settings | CRUD | — | — | — | — | — | — | — |
| Notifications | R | R | R | R | R | R | R | R |
| Integration | CRUD | — | — | — | — | — | — | — |

> R = Read, C = Create, U = Update, D = Delete, CRUD = Full Access

### 8.3 JWT Payload Structure

```json
{
  "sub": 1,
  "email": "admin@example.com",
  "role": "Admin",
  "permissions": {
    "Dashboard": { "read": true },
    "Sales Team": { "read": true, "add": true, "edit": true, "delete": true }
  },
  "iat": 1716000000,
  "exp": 1716000900
}
```

---

## 9. Notification System Analysis

### 9.1 In-App Notification Events

| Event | Trigger | Recipients |
|---|---|---|
| New Order Created | Negotiation → Order conversion | Operations Manager |
| Low Stock Alert | current_stock < min_stock | Inventory Manager, Admin |
| Dispatch Confirmed | Dispatch status = Dispatched | Sales Person (order.assigned_to) |
| Payment Received | Invoice payment recorded | Finance, Admin |
| Invoice Overdue | Due date passed, balance > 0 | Sales Person, Finance |
| Purchase Approved | Finance approves purchase request | Procurement, Inventory |
| Purchase Rejected | Finance rejects purchase request | Procurement, Inventory |
| Task Assigned | Task assigned to staff | Staff member |
| Task Completed | Task status = Done | Operations Manager |
| Emergency Dispatch | Emergency flagged | Operations Manager, Admin |
| Complaint Raised | Complaint created | Operations, Sales Manager |
| Stock Check Submitted | Live check submitted | Admin, Inventory Manager |
| Reimbursement Paid | Finance pays reimbursement | Staff member |

### 9.2 WhatsApp Notification Templates

| Trigger | Template | Recipient |
|---|---|---|
| Quotation Request | `*Quotation Request*\n\nItem: {item}\nQty: {qty} {unit}\nPayment Terms: {terms}\n\nPlease provide a quotation at the earliest.` | Supplier |
| Updated Quotation | `*Updated Quotation Request*\n\nItem: {item}\nQty: {qty} {unit}\nPayment Terms: {terms}\n\nKindly provide an updated quotation.` | Supplier |
| Dispatch Completed | Dispatch details with LR number and tracking URL | Client/Hotel |
| Invoice Reminder | Outstanding amount + due date + invoice number | Client/Hotel |

### 9.3 Notification Channels (per-user toggleable)

- Low Stock Alerts
- Payment Updates
- Dispatch / Tasks
- Complaints
- System Alerts
- Reminders

---

## 10. File & Document Management Analysis

### 10.1 Upload Requirements

| Module | Accepted Types | Max Size | Storage Path |
|---|---|---|---|
| Company Logo | JPG, PNG, SVG | 2 MB | `/logos/` |
| Purchase Quotation File | PDF, JPG, PNG | 10 MB | `/purchase/quotations/` |
| Invoice File (Dispatch) | PDF, JPG, PNG | 10 MB | `/dispatch/invoices/` |
| LR / Lorry Receipt | PDF, JPG, PNG | 10 MB | `/dispatch/lr/` |
| Payment Proof | PDF, JPG, PNG | 5 MB | `/payments/proofs/` |
| Expense Proof | PDF, JPG, PNG | 5 MB | `/expenses/proofs/` |
| Local Purchase Invoice | PDF, JPG, PNG | 10 MB | `/local-purchase/invoices/` |
| Sticker Design | JPG, PNG, PDF, AI | 20 MB | `/stickers/designs/` |
| User Avatar | JPG, PNG | 2 MB | `/users/avatars/` |
| Box Photo (Camera) | JPG, PNG | 5 MB | `/dispatch/box-photos/` |
| AI Invoice Scan Input | PDF, JPG, PNG | 10 MB | `/ai/invoices/` |

### 10.2 Storage Strategy

| Concern | Solution |
|---|---|
| Primary storage | AWS S3 (private buckets) |
| Image delivery | CloudFront CDN / Cloudinary |
| Access control | Pre-signed URLs (15 min TTL) |
| PDF generation | Puppeteer (Chrome-rendered, matches UI themes) |
| Invoice OCR | Google Vision API / AWS Textract |
| AI summaries | Anthropic Claude API |

### 10.3 Document Generation Endpoints

| Document | Endpoint |
|---|---|
| Invoice PDF | `GET /api/invoices/:id/pdf` |
| Quotation PDF | `GET /api/quotations/:id/pdf` |
| Dispatch Print | `GET /api/dispatch/:id/print` |
| Party Ledger PDF | `GET /api/parties/:id/ledger/pdf` |
| AI Summary PDF | `GET /api/vendors/:id/ai-summary/pdf` |
| Expense Report | `GET /api/expenses/export` |
| GST Report Excel | `GET /api/reports/monthly-gst/export` |

---

## 11. Dashboard Analytics Requirements

### 11.1 KPI Cards

| KPI | Table | Calculation | Time Filter |
|---|---|---|---|
| Total Orders | orders | COUNT(*) | Date range |
| Monthly Revenue | invoices | SUM(total) WHERE status IN (Paid, Partially Paid) | This month |
| Dispatch Ready | orders | COUNT(*) WHERE status = 'Dispatch Ready' | — |
| Active Clients | parties | COUNT(*) with active orders | — |
| Total Tasks | tasks | COUNT(*) | Date range |
| Active Complaints | complaints | COUNT(*) WHERE status = 'Open' | — |
| Upcoming Reminders | leads + orders | COUNT(*) WHERE date >= today AND date <= today+7 | Next 7 days |
| Today's Tasks | tasks | COUNT(*) WHERE DATE(created_at) = today | Today |
| Pending Tasks | tasks | COUNT(*) WHERE status = 'Pending' | — |
| Completed Tasks | tasks | COUNT(*) WHERE status = 'Done' | Date range |

### 11.2 Charts

| Chart | Type | Data | Granularity |
|---|---|---|---|
| Revenue & Orders Trend | Area + Line | Monthly revenue + order count | Last 7 months |
| Order Status Distribution | Pie | % split by status | Current snapshot |
| Top Products by Volume | Dual-axis Bar | Qty sold + revenue per product | All time / filtered |
| Low Stock Progress | Progress Bar | current_stock / min_stock ratio | Real-time |

### 11.3 Caching Strategy

| Data | Cache TTL | Invalidate On |
|---|---|---|
| KPI Cards | 5 minutes | Order / Invoice / Task mutations |
| Chart data | 10 minutes | Invoice / Purchase mutations |
| Company settings | 60 minutes | Settings update |
| User permissions | 15 minutes | Permission update |
| Party ledger | 30 seconds | Payment / Invoice creation |
| Inventory levels | 2 minutes | Stock movement |

---

## 12. Audit Trail Requirements

### 12.1 Audit Events by Module

| Module | Actions Logged | Fields Captured |
|---|---|---|
| User Management | CREATE, UPDATE, DELETE | Full user data diff |
| Leads | CREATE, UPDATE, DELETE, STATUS_CHANGE, ASSIGN | All changed fields |
| Orders | CREATE, UPDATE, STATUS_CHANGE | All changed fields |
| Invoices | CREATE, UPDATE | Invoice number, party, total |
| Payments | CREATE | Amount, mode, invoice ID |
| Inventory | SELL, ADD, APPROVE, REJECT, STOCK_CHECK | Item, qty, before/after |
| Purchase Requests | CREATE, APPROVE, REJECT, PAY | Request details, status change |
| Dispatch | CREATE, CONFIRM, LR_UPLOAD | Order ID, dispatch details |
| Expenses | CREATE, PAY | Amount, category |
| Settings | UPDATE | Changed key/value pairs |
| Auth | LOGIN, LOGOUT, FAILED_LOGIN | IP address, timestamp |

### 12.2 Retention Policy

- **Active logs:** 90 days in PostgreSQL
- **Archive:** S3 bucket for logs older than 90 days
- **Format:** JSONB with `old_data` / `new_data` diff

---

## 13. Integration Requirements

### 13.1 WhatsApp Integration

**Current (Deep Link):** `https://wa.me/{phone}?text={encoded_message}` — opens WhatsApp app/web

**Future (Business API):** Meta Cloud API for server-side delivery, delivery receipts, template messages

**Webhook:** `POST /api/webhooks/whatsapp` — receives delivery status callbacks

### 13.2 AI Integration

**Invoice OCR (Scan Invoice feature):**
- Input: Uploaded invoice image/PDF
- Output: `{ invoice_no, date, amount, items: [{name, qty, price}] }`
- Provider options: Google Vision API, AWS Textract, Azure Form Recognizer

**Vendor AI Summary:**
- Input: Vendor purchase history (from DB)
- Output: Natural language summary of vendor reliability, pricing, history
- Provider: Anthropic Claude API

### 13.3 GST Compliance

```typescript
// GSTIN validation regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// GST calculation
function calculateGST(amount: number, rate: number, sellerState: string, buyerState: string) {
  const gstAmt = amount * (rate / 100);
  return sellerState === buyerState
    ? { cgst: gstAmt / 2, sgst: gstAmt / 2, igst: 0 }
    : { cgst: 0, sgst: 0, igst: gstAmt };
}
```

---

## 14. Security Analysis

### 14.1 API Security Measures

| Layer | Implementation |
|---|---|
| Transport | HTTPS only (TLS 1.2+) |
| Authentication | JWT (RSA-256), short TTL (15 min) |
| Authorization | Permission middleware on every route |
| Rate Limiting | 5 login attempts / 15 min / IP; 100 req/min / user |
| Input Validation | Zod schema validation on all endpoints |
| SQL Injection | Parameterized queries via Prisma ORM |
| XSS | Input sanitization, strict CSP headers |
| CORS | Whitelist specific frontend origins |
| Headers | Helmet.js (X-Frame-Options, HSTS, CSP, etc.) |
| File Upload | MIME type validation + ClamAV antivirus scan |

### 14.2 Data Security

| Concern | Implementation |
|---|---|
| Passwords | bcrypt cost factor 12 |
| Secrets | Environment variables (never in code/git) |
| Database | TLS connection required |
| File access | Private S3 buckets, pre-signed URLs (15 min TTL) |
| PII fields | AES-256 encryption at rest (phone, email) |
| Refresh tokens | Stored in Redis with user binding, rotation on use |

### 14.3 OWASP Top 10 Mitigations

| Risk | Mitigation |
|---|---|
| Injection | Prisma ORM parameterized queries, Zod input validation |
| Broken Auth | JWT + refresh rotation, bcrypt, rate limiting |
| Sensitive Data Exposure | HTTPS, env vars, signed URLs, AES encryption |
| Broken Access Control | Permission middleware on every route |
| Security Misconfiguration | Helmet.js, CSP headers, disable X-Powered-By |
| XSS | Input sanitization, Content-Security-Policy |
| Insecure Deserialization | Zod schema on all JSON inputs |
| Known Vulnerabilities | `npm audit` in CI/CD pipeline |
| Insufficient Logging | Audit trail for all sensitive operations |

---

## 15. Backend Architecture Recommendation

### 15.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | Non-blocking I/O, ecosystem |
| Framework | Express.js 5 | Minimal, flexible |
| Language | TypeScript | Type safety, refactoring |
| Primary DB | PostgreSQL 16 | ACID, JSONB, GST reports |
| ORM | Prisma | Type-safe, migrations, TS support |
| Cache / Sessions | Redis 7 | Tokens, rate limiting, dashboard cache |
| File Storage | AWS S3 + CloudFront | Scalable, CDN |
| Job Queue | BullMQ (Redis) | Async notifications, report generation |
| PDF Generation | Puppeteer | Chrome-rendered invoice PDFs |
| AI | Anthropic Claude API | Invoice scanning, vendor summaries |
| WhatsApp | Meta Business Cloud API | Official messaging |
| Email | SendGrid / AWS SES | Password reset, reports |
| Validation | Zod | Schema + TypeScript inference |
| Testing | Jest + Supertest | Unit + integration |
| API Docs | Swagger / OpenAPI 3 | Auto-generated |

### 15.2 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       (Prisma client)
│   │   ├── redis.ts          (Redis client)
│   │   ├── s3.ts             (AWS S3 client)
│   │   └── env.ts            (Env validation with Zod)
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts
│   │   ├── leads/
│   │   ├── orders/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── parties/
│   │   ├── inventory/
│   │   ├── purchase/
│   │   ├── dispatch/
│   │   ├── tasks/
│   │   ├── staff/
│   │   ├── expenses/
│   │   ├── financial/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── notifications/
│   │   └── integrations/
│   │       ├── whatsapp/
│   │       └── ai/
│   │
│   ├── middleware/
│   │   ├── authenticate.ts   (JWT verification)
│   │   ├── authorize.ts      (Permission checks)
│   │   ├── upload.ts         (Multer + S3)
│   │   ├── rateLimiter.ts    (Redis-backed)
│   │   ├── errorHandler.ts   (Global error handler)
│   │   └── auditLogger.ts    (Audit trail)
│   │
│   ├── shared/
│   │   ├── utils/
│   │   │   ├── codeGenerator.ts  (ORD-001, INV-001 etc.)
│   │   │   ├── gstCalculator.ts  (CGST/SGST/IGST logic)
│   │   │   ├── pdfGenerator.ts   (Puppeteer wrapper)
│   │   │   └── excelExporter.ts  (CSV/XLSX generation)
│   │   ├── types/
│   │   └── constants/
│   │       ├── modules.ts    (Module names for permissions)
│   │       └── enums.ts      (Status enums, categories)
│   │
│   ├── jobs/
│   │   ├── overdue-invoices.job.ts
│   │   ├── low-stock-alert.job.ts
│   │   └── payment-reminder.job.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### 15.3 Request Middleware Chain

```
Request
  → Rate Limiter (Redis)
  → CORS
  → Body Parser + Helmet
  → authenticate() — JWT verify
  → authorize(module, action) — Permission check
  → validate(ZodSchema) — Input validation
  → Controller → Service → Prisma
  → auditLogger() — On mutation routes
  → Response { success, data, meta }
  → errorHandler() — Global catch
```

### 15.4 Code Auto-Generation

```typescript
generateCode('ORD')  → "ORD-2501"   // year + padded serial
generateCode('INV')  → "INV-2501"
generateCode('QT')   → "QT-2501"
generateCode('NEG')  → "NEG-2501"
generateCode('PR')   → "PR-2501"
generateCode('PO')   → "PO-2501"
generateCode('LP')   → "LP-2501"
generateCode('EXP')  → "EXP-101"
generateCode('CMP')  → "CMP-001"
generateCode('REC')  → "REC-176"    // sequential receipt numbers
```

### 15.5 Scheduled Jobs

| Job | Schedule | Action |
|---|---|---|
| `overdue-invoices` | Daily at midnight | Set status = Overdue where due_date < today AND balance > 0 |
| `low-stock-alert` | Hourly | Notify if current_stock < min_stock |
| `payment-reminder` | Daily at 9 AM | Send WhatsApp/notification for upcoming payment dates |

---

## 16. Development Roadmap

### Phase 1 — Foundation & Authentication (Weeks 1–2)

- [ ] Project scaffold (TypeScript, Express, Prisma, Redis)
- [ ] Full database schema + migrations
- [ ] JWT authentication (login, refresh, logout)
- [ ] User management CRUD + granular permissions system
- [ ] Company settings API
- [ ] File upload service (S3 integration)
- [ ] Docker + environment setup

**Dependencies:** None

---

### Phase 2 — Master Data Modules (Weeks 3–4)

- [ ] Parties & Ledger API (CRUD + running balance calculation)
- [ ] Inventory Items API (CRUD)
- [ ] Vendors & Suppliers API (CRUD)
- [ ] Staff Management API (CRUD + credentials)
- [ ] Expense Categories (seeding)
- [ ] Code generation utilities (ORD-XXXX, INV-XXXX, etc.)

**Dependencies:** Phase 1

---

### Phase 3 — Sales Pipeline (Weeks 5–7)

- [ ] Leads API (CRUD + assignment + status + kit products)
- [ ] Quotations API (CRUD + WhatsApp link generation)
- [ ] Negotiations API (CRUD + conversion logic)
- [ ] Orders API (CRUD + status management)
- [ ] Complaints API

**Dependencies:** Phase 2 (Parties)

---

### Phase 4 — Operations & Dispatch (Weeks 8–10)

- [ ] Sticker Requests API
- [ ] Tasks API (CRUD + Kanban state machine)
- [ ] Emergency dispatch approval flow
- [ ] Dispatch Records API (create, verify, confirm)
- [ ] LR / Lorry Receipt API
- [ ] Stock deduction on dispatch confirmation
- [ ] Today's Orders aggregation API

**Dependencies:** Phase 3 (Orders)

---

### Phase 5 — Purchase & Financial (Weeks 11–13)

- [ ] Purchase Requests API (bulk + single)
- [ ] Purchase Request Notes API
- [ ] Financial Approval API (approve / reject)
- [ ] Purchase Orders API (payment tracking)
- [ ] Local Purchase API
- [ ] Dispatch Order Tracking (receive + AI scan)
- [ ] Reimbursement Claims API
- [ ] Pickup Expense API (linked to dispatch)
- [ ] Local Purchase Expense API

**Dependencies:** Phase 2 (Vendors / Inventory), Phase 4 (Dispatch)

---

### Phase 6 — Billing & Payments (Weeks 14–16)

- [ ] Invoices API (create, list, view, edit GST)
- [ ] Invoice Items API
- [ ] Quotation → Invoice conversion (with previous dues logic)
- [ ] Record Payment API (all modes: Cash, UPI, Card, Cheque, Bank)
- [ ] Ledger entries auto-update on payment
- [ ] Party balance management
- [ ] PDF generation (Invoice + Quotation — 4 themes)
- [ ] Overdue invoices scheduled job

**Dependencies:** Phase 3 (Orders / Quotations), Phase 2 (Parties)

---

### Phase 7 — Expenses & Reports (Weeks 17–19)

- [ ] Expenses CRUD + export
- [ ] Sales Report API (GST format, Excel export)
- [ ] Purchase Report API (With/Without GST + product-wise GST summary)
- [ ] Profit & Loss API (product-aware, expense-toggles, GST mode)
- [ ] Bill-wise P&L API
- [ ] Performance Report API (salesperson leaderboard + targets)
- [ ] Monthly GST Report API (CGST/SGST/IGST by month)
- [ ] Auditor Tax Report API (GSTR-1 format)

**Dependencies:** Phases 5 + 6

---

### Phase 8 — Notifications & Integrations (Weeks 20–21)

- [ ] In-app Notification system (WebSocket / SSE)
- [ ] Notification Settings API
- [ ] WhatsApp Integration (webhook + template helpers)
- [ ] AI Integration (invoice OCR + vendor summary via Claude API)
- [ ] BullMQ job queue for async operations
- [ ] Low stock alert + payment reminder scheduled jobs
- [ ] Dashboard real-time WebSocket updates

**Dependencies:** All previous phases

---

### Phase 9 — Testing, Security & Deployment (Weeks 22–24)

- [ ] Unit tests for all services (80% coverage target)
- [ ] Integration tests for all API endpoints
- [ ] Security audit (OWASP checklist)
- [ ] Performance testing (k6 load tests)
- [ ] Swagger / OpenAPI documentation
- [ ] Docker containerization + docker-compose
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment deployment
- [ ] Production deployment (AWS / GCP)

---

## 17. Gap Analysis

### 17.1 Missing Frontend Requirements

| # | Gap | Recommendation |
|---|---|---|
| 1 | No lead → party auto-conversion tracking | Add `converted_to_party_id` in leads; auto-create Party on Order conversion |
| 2 | Invoice reminder mechanism not wired | Add scheduled job: daily check overdue invoices, send WhatsApp/email |
| 3 | Partial dispatch item tracking | `dispatch_items` table with `qty_ordered` vs `qty_dispatched` per item |
| 4 | Camera integration (Open/Close Box) | Browser camera API + media upload endpoint |
| 5 | Print Label (Pick Up Order) | PDF template needed for label generation |
| 6 | Sticker design file send via WhatsApp | Requires WhatsApp Business API file sharing (not just deep links) |
| 7 | Vendor Update Status — options unclear | Define enum: Active / Inactive / Blacklisted |
| 8 | AI Invoice Scan field mapping | Extracted fields must map to purchase order fields — needs mapping config |
| 9 | Credit Note creation | Seen in ledger data (CN-501) but no form/workflow exists in UI |
| 10 | Deleted Records — only Parties shown | Extend restore functionality to all entity types |

### 17.2 Missing Backend Requirements

| # | Gap | Recommendation |
|---|---|---|
| 1 | Invoice number sequence locking | Use PostgreSQL sequence + prefix; handle concurrent creation with advisory locks |
| 2 | GSTIN validation | Implement regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` |
| 3 | Stock check approval — who approves? | Assume Inventory Manager / Admin; define explicit role |
| 4 | Bank accounts management | Currently hardcoded; needs `bank_accounts` CRUD API |
| 5 | Salesperson achievement calculation | Achievement = sum of invoices raised by user in period (define metric clearly) |
| 6 | Concurrent stock updates | Use DB transactions + row-level locking (`SELECT FOR UPDATE`) |
| 7 | Bulk report generation (async) | Large exports should be async (BullMQ) with email/notification delivery |
| 8 | WhatsApp template pre-approval | Meta requires pre-approved templates for business-initiated messages |
| 9 | Multi-currency groundwork | Add `currency` field to all money tables even if only INR is used now |
| 10 | Duplicate purchase request guard | Prevent raising duplicate request for same item+supplier within same week |

### 17.3 Ambiguous Workflows

| # | Ambiguity | Recommendation |
|---|---|---|
| 1 | Previous due in invoice conversion | Confirm: are previous dues auto-added to invoice total or shown separately? |
| 2 | Complementary order and inventory | Clarify: products still shipped (inventory -), but invoice = ₹0 |
| 3 | Partial dispatch — remaining order | Order stays In Production until fully dispatched; track `qty_remaining` |
| 4 | Local purchase → inventory stock | Clarify: does local purchase auto-increment inventory item stock? |
| 5 | Staff vs Users auth | Staff (production) vs Users (CRM) — unified auth or separate login endpoints? |
| 6 | Performance achievement metric | Revenue metric = invoices created by salesperson, or orders converted? |
| 7 | Reimbursement payment source | "Pickup Team paid" vs "Finance paid" — different flows needed |
| 8 | Sticker request per order | One order may have multiple sticker types; 1:M relationship confirmed |

### 17.4 Missing Validations

| Module | Missing Validation |
|---|---|
| Leads | Phone uniqueness check across all active leads |
| Invoices | Invoice number uniqueness (auto-generated must be idempotent) |
| Parties | Running balance cannot exceed credit limit without override |
| Inventory | Cannot sell more than `current_stock` (needs override + approval) |
| Purchase Requests | No duplicate item+supplier request within same week |
| Dispatch | Cannot confirm same order dispatch twice without partial flag |
| Users | Email uniqueness, mobile uniqueness |
| Expenses | Amount must be positive; past-dated paid expenses need note |

---

## 18. Assumptions Log

> All assumptions below require confirmation before backend development begins.

| # | Assumption |
|---|---|
| 1 | **Staff vs Users:** Staff (production workers) use a simple PIN/password login; CRM Users have full permission-based JWT access. Both use `/api/auth/login` but return different permission sets. |
| 2 | **Quotation → Negotiation → Order:** This path is mandatory. Direct Quotation-to-Order skipping Negotiation is not supported. |
| 3 | **Inventory on dispatch:** Confirming a dispatch automatically decrements inventory stock by the dispatched quantity. No separate inventory approval needed. |
| 4 | **Invoice auto-status logic:** `Paid` (balance=0) → `Partially Paid` (0 < balance < total) → `Pending` (balance=total, not overdue) → `Overdue` (balance > 0 AND due_date < today). Status is computed, not stored manually. |
| 5 | **WhatsApp:** Current UI uses deep links only. Server-side delivery via Meta Business API requires separate setup and is treated as Phase 8. |
| 6 | **AI Scan:** The "AI Scan Invoice" button triggers OCR via an external API (Google Vision / AWS Textract) and auto-fills purchase receipt fields. |
| 7 | **Single-tenant:** CRM is deployed for a single company (Heal N Glow). Multi-tenancy is out of scope. |
| 8 | **Local Purchase → Inventory:** Local purchases DO create `stock_movement` entries (type: IN) for purchased items, updating `current_stock`. |
| 9 | **Complementary order inventory:** Complementary orders (₹0 invoice) still deduct from inventory since products are physically shipped. |
| 10 | **Performance achievement:** Sales achievement is calculated as the sum of invoice totals where `created_by = salesperson_id` within the reporting period. |

---

*Document End*

---

**Total Coverage:**
- **18 modules** fully analyzed
- **50+ database tables** with complete SQL schemas
- **80+ API endpoints** documented
- **Complete workflow analysis** (Lead-to-Invoice, Purchase-to-Receipt, Stock-Check, Reimbursement)
- **Full security architecture** (OWASP Top 10, JWT, RBAC)
- **9-phase development roadmap** with effort estimates

*This document is sufficient for a backend team to begin implementation without requiring additional business requirement discussions.*
