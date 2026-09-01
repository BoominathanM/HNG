# Heal N Glow — HNG CRM
## Product Document & User Manual (Client Handover)

**Prepared for:** Heal N Glow
**Document type:** Functional product manual — module-wise & tab-wise, workflow explanations, business rules, roles, integrations and reports
**Last updated:** 30 August 2026 · rev. 2 (Heal N Glow answers incorporated)

---

## Table of Contents

1. [What HNG CRM Is](#1-what-hng-crm-is)
2. [Key Concepts & Terminology](#2-key-concepts--terminology)
3. [Roles & Permissions](#3-roles--permissions)
4. [The Screen Layout](#4-the-screen-layout)
5. [Module & Tab Reference](#5-module--tab-reference)
   - 5.1 [Dashboard](#51-dashboard)
   - 5.2 [Sales Team](#52-sales-team)
   - 5.3 [Operations](#53-operations)
   - 5.4 [Task Management](#54-task-management)
   - 5.5 [Dispatch Team](#55-dispatch-team)
   - 5.6 [Staff Management](#56-staff-management)
   - 5.7 [Inventory](#57-inventory)
   - 5.8 [Purchase](#58-purchase)
   - 5.9 [Vendors & Suppliers](#59-vendors--suppliers)
   - 5.10 [Billing](#510-billing)
   - 5.11 [Ledgers](#511-ledgers)
   - 5.12 [Financial](#512-financial)
   - 5.13 [Expenses](#513-expenses)
   - 5.14 [Reports](#514-reports)
   - 5.15 [Notifications](#515-notifications)
   - 5.16 [Integration](#516-integration)
   - 5.17 [Settings](#517-settings)
6. [End-to-End Workflows](#6-end-to-end-workflows)
7. [Business Rules & Approval Gates](#7-business-rules--approval-gates)
8. [Automation & Alert Engine](#8-automation--alert-engine)
9. [Integrations & Automation Detail](#9-integrations--automation-detail)
10. [Reports Catalogue](#10-reports-catalogue)
11. [Status Glossary](#11-status-glossary)
12. [Configuration Reference](#12-configuration-reference)

---

## 1. What HNG CRM Is

HNG CRM is the single system that runs the entire Heal N Glow business — from the first sales call to the money landing in the bank, and from a low-stock warning to raw material arriving on the shelf.

Heal N Glow manufactures and supplies **hospitality amenity products** — soaps, shampoos, conditioners, shower gels, coconut oil, dental kits, combs, wooden brushes and personalised gift kits — to hotels, resorts, hospitals and hospitality chains.

The software joins four business cycles into one connected flow:

| Cycle | Flow inside the system |
|---|---|
| **Sales** | Lead → Quotation → Negotiation → Order → Dispatch → Invoice → Payment |
| **Procurement** | Low stock → Purchase request → Financial approval → Vendor payment → Goods receipt → Stock updated |
| **Operations / Production** | Order → Design & printing → Stock allocation → Packing tasks → Ready to dispatch |
| **Finance** | Expenses, reimbursements, ledgers, GST compliance, Profit & Loss reporting |

Everything is **role-controlled**: each staff member sees only the modules and tabs an administrator has granted them.

---

## 2. Key Concepts & Terminology

Understanding these terms makes every screen easier to read.

### Sales pipeline documents

| Term | Meaning |
|---|---|
| **Lead** | A potential customer (a hotel or hospital) and everything known about them — contact people, address, GST details, room count, what products they want. Every deal starts here. |
| **Quotation** | A formal price offer generated from a Lead and sent to the customer (often over WhatsApp). |
| **Negotiation** | A revised quotation after the customer asks for changes to price or terms. Created only from a Quotation. |
| **Order** | A confirmed deal. Created only from a Negotiation (or directly converted). Once an Order exists, Operations, Tasks, Dispatch and Billing all pick it up. |
| **Invoice** | The tax document raised against an Order (or standalone) once goods are dispatched / payment is due. |
| **Party** | A customer or vendor record used for billing and the ledger (running account balance). A Lead automatically becomes a customer Party. |
| **Complaint** | An issue raised against a specific Order. |

### Order composition — the "3-way" model

Every Order line is one of three categories:

| Category | Meaning |
|---|---|
| **Personalized Kit** | A branded gift kit (e.g. a welcome kit) that bundles several products together, personalised with the hotel's logo. May also carry extra loose products. |
| **Separate Kit** | A standard kit sold as-is, no bundled extras. |
| **Separate Product** | An individual product line (e.g. 5,000 soap bars). |

Kits have a **Display Unit** — the outer presentation packaging (Box, Frosted Ziplock, Butter Paper, Wooden Brush, or Other). Each kit in a multi-kit order can route to its **own** packaging line in Operations.

### Order type & customer type

| Flag | Values | Effect |
|---|---|---|
| **Lead / Order type** | `ORDER` or `SAMPLE` | SAMPLE orders skip payment gating (no money expected) and trigger a **sample follow-up** reminder **1 week (7 days) after dispatch**. |
| **Hotel type** | `OLD` (existing customer) or `NEW` | Used in sales targets and performance reports. |
| **Category** | Hotel / Hospital / custom | Changes field labels across Leads and Orders (e.g. "Hotel Name" vs "Hospital Name") and adds a filter. |
| **Bill type** | `GST` or `Non-GST` | Controls whether tax is applied on the resulting quotation/invoice. |

### Packaging & printing terms

| Term | Meaning |
|---|---|
| **Sticker** | A printed label applied to a product or box. "Sticker = Yes" sends the item through the Sticker/Printing line first. |
| **Printing** | Direct print onto the packaging (not a stuck label). Also routes through the print line first, then to its packaging line. |
| **Display Unit / Packing Material** | The physical packaging: Box, Frosted Ziplock (pouch), Butter Paper, Wooden Brush, or Other. Each has its own Operations tab and its own vendor/config. |
| **Kit Display Unit** | The chosen outer packaging for a kit; changing it needs dual approval (Sales + Operations). |

### Money terms

| Term | Meaning |
|---|---|
| **Payment terms** | 100% Payment · 50% Advance + 50% on Dispatch · 50% Advance + 50% after Delivery (max 15 days) · Credit 30 Days |
| **Previous due / Pending amount** | A customer's earlier unpaid balance, shown automatically on new invoices. |
| **Complementary** | An order/invoice recorded at ₹0 (goodwill or complaint resolution). |
| **Round Off / Courier Charge** | Adjustments captured at the time payment is recorded. |
| **CGST / SGST / IGST** | Indian GST components. Heal N Glow bills **CGST + SGST on intra-state sales and IGST on inter-state sales** — the split follows the customer's location. |
| **COGS** | Cost of goods sold — the purchase cost behind a sale, used for Profit & Loss. |

---

## 3. Roles & Permissions

### How access works

- **Super Admin** and **Admin** see everything and bypass all permission checks.
- Every other user is **denied by default**. An administrator grants access in **Settings → User Management**.
- Access is controlled at two levels:
  1. **Module level** — with four separate rights per module: **Read**, **Add**, **Edit**, **Delete**. A user with no Read right does not see the module in the sidebar at all.
  2. **Tab level** — within a module, individual tabs can be switched off for a user (e.g. a sales executive can see Leads but not the Performance tab).

### Modules that can be permissioned

Dashboard · Sales Team · Operations · Task Management · Dispatch Team · Staff Management · Inventory · Purchase · Vendors & Suppliers · Billing · Ledgers · Financial · Expenses · Reports · Notifications · Integration · Settings

### Typical roles (departments)

| Department | Example roles | Typical access |
|---|---|---|
| **Sales** | Sales Executive, Sales Manager | Sales Team, Dashboard, own Reports |
| **Production** | Production Lead, Packing Staff, Sticker, Box, Ziplock | Operations, Task Management, Inventory (view) |
| **Dispatch** | Dispatch staff, Pickup team | Dispatch Team, Task Management (view) |
| **Quality** | Quality Check | Operations (view), Task Management |
| **Vendors / Procurement** | Vendor Manager, Procurement | Purchase, Vendors & Suppliers, Inventory |
| **Finance / Accounts** | Finance | Financial, Billing, Ledgers, Expenses, Reports |
| **Admin** | Owner, Operations Head | All modules + Settings |

> Staff logins are created and enabled/disabled in **Staff Management**; the module permissions themselves are assigned in **Settings → User Management**.

---

## 4. The Screen Layout

- **Left sidebar** — the module menu. Only modules you have access to appear. It collapses to icons; badges show pending task count and unread notifications. Company logo and name at the top come from Settings.
- **Top header** — page title / breadcrumb, quick search where relevant, profile menu, light/dark theme toggle.
- **Page body** — almost every module opens on a set of **tabs**. Most tabs are a filterable table with an "Add" button and row actions (View / Edit / Delete / Print / WhatsApp / Download).
- **Detail screens** — Operations, Tasks and Dispatch each have a dedicated per-record screen (opened by clicking a row) with a **progress stepper** across the top showing exactly where that order stands.
- **Alerts** — a live in-app alert listener shows escalating pop-ups for things that need action (approvals, overdue payments, low stock), with an optional sound.

---

## 5. Module & Tab Reference

### 5.1 Dashboard

**Purpose:** one-glance health of the business. Read-only.

- **KPI cards**, filterable by Today / This Week / This Month / All Time: Total Orders, Monthly Revenue, Dispatch-Ready orders, Active Clients, Total / Pending / Completed / Today's Tasks, Active Complaints, Upcoming Reminders.
- **Charts:** Revenue & Orders trend (last months), Order-status distribution (pie), Top products by volume & revenue.
- **Lists:** Recent Orders, Low-Stock Alerts (with a fill bar per item), Recent Activity timeline.

---

### 5.2 Sales Team

**Route:** Sales Team. The heart of the customer pipeline. Tabs:

#### Performance
Sales-team leaderboard and each person's **target vs achievement** — split by New-hotel revenue, Old-hotel revenue, payments collected, software sales and number of new clients. Shows reward tier progress.

#### Leads
The master list of prospects. **Add Lead** opens a large form covering:
- Category (Hotel / Hospital / custom) and Hotel/Company name, Branch, No. of Rooms, General Occupancy %.
- Contact person + designation + phone; a mandatory alternative contact (role, name, number).
- Email, location/city, destination, **billing address** and a separate **shipping address** (with a hotel-lookup preview if the hotel already exists).
- GST number and GST %, bill type (GST / Non-GST).
- Assign Lead To (sales user), Source, Priority flag + note.
- "Interested in software?" branch — previous software name, price, expiry date.
- **Products / Kits** — one or more rows, each either a Personalized Kit, Separate Kit or Separate Product, with full specification (size, fragrance, sticker/printing, packing material, per-kit contents, price, GST %).
- Status (Cold / Warm / Hot / Active / Dead), follow-up date & time, notes, any advance paid.

**Row actions:** View (full detail screen), Edit (per-card inline editing — you can expand just one product card without losing the others), Add Quotation, Add Negotiation, Convert to Order, delete.
A full **status history** is kept for every lead.

#### Reminders
Every lead follow-up that is due — today, overdue, and upcoming. Sales staff work this list daily. Reminders also fire as in-app alerts and (optionally) WhatsApp messages.

#### Quotations & Negotiations
Both document types in one tab.
- **Create Quotation** from a lead — pulls the customer info and product list; you set prices, GST and terms. Produces a branded PDF you can **View / Print / Download / send on WhatsApp**.
- **Convert to Negotiation** — a revised version when the customer pushes back on price. Negotiation pricing syncs back so Billing sees the final agreed numbers.
- **Convert to Order** — locks the deal and pushes it into Operations, Tasks, Dispatch and Billing. Payment and the quotation file carry across.
- A special **"Modification"** status lets Finance send a quotation request back for changes.

#### Orders
Confirmed orders. Shows client, composition summary (Personalized / Separate Kit / Separate Product totals), amount, advance, balance, live payment status and order status.
**Edit Order** (per-card, lead-style) covers payment terms, payment reminder date, advance paid, expected delivery date, and product details.
Filters include category (Hotel/Hospital), emergency orders, and salesperson.

#### Parties
The customer directory as seen by Sales. Each party has a rich detail screen (same depth as a lead view): contact info, all their orders, ledger balance, and per-party **Excel / PDF download** of the info card. A "Created" date is keyed to the originating lead.

#### Consumption Forecast
For existing customers the system estimates how fast they burn through amenities — **rooms × occupancy × elapsed days, at a rate of 1 unit per room per day per product**. When a customer is projected to run out, they surface here with a **"Reorder Now"** status and an alert goes to the Sales + Admin pool. A grace period stops repeat nagging.

#### Complaints
Raise a complaint against an order (description + order link). Track status Open → In Progress → Resolved → Closed with full history. Complaint counts feed the Performance report.

---

### 5.3 Operations

**Route:** Operations. Turns a confirmed order into physically packed goods. Tabs:

#### Order Management
Every order that needs production work, with a **6-stage progress bar**:

`Order Received → Sent to Design → Client Approved → Printing → Stock Received → Task Assigned`

Click an order to open its **Operation Detail** screen. That screen holds the full production checklist per product / per kit:
- Product, Kit/Spec, Category, required vs available inventory stock, HSN code, default size, packing material, brand, product attributes.
- **Printing Status** (Yet to Receive / Received / Closed), **Design** upload & approval, **Invoice** view.
- **Ops Approval** — Operations signs off that the item is ready.
- **Assign Task** — creates packing tasks (see Task Management). A task can be assigned to several people at once for kit packing.
- **Emergency Qty** handling — if only part of a quantity is urgent, that portion can be split out and fast-tracked (with approval).

The item cannot move to task assignment until design PDF is ready, design sent, client approved, printing started, stock received and Operations approved — all ticked.

#### Sticker Printing
The design-and-print queue. For each order/product or box that needs a label or print:
- Create a **sticker/print request** (order, hotel logo, quantity, sticker size, upload design).
- Send the design to the printing supplier on **WhatsApp**.
- Move it through: design requested → design uploaded → sent to printer → printing → printed → received.
- The design vendor can push a request back as **"Design Change"** with a reason.
- **Sticker → Box / Frosted routing:** if a sticker job actually needs to become box or pouch printing, it re-routes with **dual approval**.

#### Box · Frosted Ziplock · Butter Paper · Wooden Brush · Other
One tab per **packaging line**. Each works the same way, in three steps:
1. **Packing configuration** — confirm the packaging spec, sticker size for that material, and the vendor.
2. **Upload the packaging invoice** (the vendor's bill for boxes/pouches/paper etc.).
3. Mark the packaging received / done, which frees the order to be packed and dispatched.

Kits route to whichever of these tabs matches their Display Unit; loose products route by their packing material. "Other" is only used when explicitly chosen.

#### Packaging Invoices sub-screen
A consolidated view of all uploaded packaging invoices by type, reachable from the packaging tabs.

---

### 5.4 Task Management

**Route:** Task Management. The production shop-floor task list. Tabs:

#### Current Task
All live packing/printing/quality tasks. Each task shows the order, product/kit, quantity, assignee(s), priority (Normal / Medium / High / Urgent), and the order's **payment status** (tasks inherit it from Billing).
Actions: **Start → Pause → Resume → Done**. Time spent is tracked automatically and rated against the estimate when marked Done.
**Emergency Dispatch** on a task requests permission to dispatch before the normal gates — this needs **dual approval (Sales + Operations Head)**.

#### Suggested Task
The system proposes the packing tasks an order still needs based on its products and the packing configuration, so nothing is forgotten. Generic product names are matched carefully so e.g. a comb isn't mislabelled with paste-packing steps.

#### Pending Remaining Qty
Where an order was partly packed/dispatched, this tab shows the outstanding quantity still to be produced.

#### Time Management
Per-task-type time configuration (estimated minutes per unit). Feeds the automatic actual-vs-estimate rating.

#### Performance Report
Staff productivity: tasks completed, on-time %, average time vs estimate, per person and per task type.

#### Task Detail screen
Opened by clicking a task: full context, the assignment history, time log (every Start/Pause/Resume/Completion event), and the Done / Emergency actions.

---

### 5.5 Dispatch Team

**Route:** Dispatch Team. Gets packed goods verified, invoiced and shipped. Tabs:

#### Dispatch Orders
Orders ready to ship. Click one to open **Dispatch Detail**, with a stepper: `Packing → Verified → Dispatched`.
Inside:
- **Line-by-line verification** — each product/kit line must be ticked **Verify** before it can be dispatched. Dispatch quantity per line supports **Full** or **Partial** dispatch.
- **Open-box / closed-box photos** per line (camera capture) as proof of packing.
- **Invoice entry** — invoice number and date, then **upload the invoice** file. The printed dispatch total is computed live from the current order composition (not a frozen figure).
- **Auto-notify sales person** and **Send WhatsApp** checkboxes (both on by default).
- **Save as draft** or **Confirm Dispatch**.
- **Report Mismatch** — if the packed goods don't match the paperwork, raise a reason; it goes to the order's salesperson for a single approval, which then unlocks re-upload.

#### Pending Dispatches
Orders packed but not yet fully dispatched — the dispatch team's to-do list, including anything dispatched today.

#### Pick Up Order
Orders where an employee personally collects goods / drops them at a transporter. Tracks taken status (Pending / Taken / Pickup Dropped) and links to the reimbursement of that employee's expense.

#### Transport
Lorry / courier handoff. Per dispatch round: transporter name, weight, number of boxes, destination, confirmed-by.
- **Scan Lorry Receipt** — opens the camera, captures the LR, uploads it and auto-reads the details with AI.
- Enter LR number and tracking URL, then mark **Finished Dispatch**.
- **Mismatch approvals:** a wrong **transporter name** needs a single Sales approval (non-blocking); wrong **package count** or **destination** needs a reason plus **dual Sales + Operations approval** and **blocks** "Finished Dispatch" until cleared.

---

### 5.6 Staff Management

**Route:** Staff Management. The employee directory and login control.

- **Staff list** — name, role, department (Production / Dispatch / Quality / Sales / Vendors), phone, salary, active/inactive.
- **Add / Edit staff.**
- **Role logins** — set or change a staff member's password and access description; **enable / disable** their login without deleting the record.
- **Reimbursement claims** — staff submit Transport / Food / Other claims here; they then appear for Finance to pay in the Financial module.

> Note: *what* a user can access (module permissions) is set in **Settings → User Management**; *whether* they can log in at all is set here.

---

### 5.7 Inventory

**Route:** Inventory. Stock of raw materials, finished products, kits and packaging. Tabs:

#### Stock Inventory
The item master. **Add Item:** name, item code, category, unit (ml / g / Pcs / Kg / Ltr), value/size, opening stock, minimum stock, purchase price, selling price, HSN code, sales discount, and the **vendor**.
Each item keeps **per-vendor purchase batches**; when an order consumes stock it deducts **FIFO** (oldest purchase first).
- **Sell Stock** and **Add Stock** both go through an **approval queue** — a staff request, then a manager approves before the stock number changes.
- Per-material **sticker sizes** are stored here (Box / Ziplock / Butter Paper) and are pulled automatically onto leads when "Sticker = Yes".
- Adding an item whose code already exists **merges** the new stock into the existing item.

#### Bulk Items
Bulk/base stock (e.g. a drum of shampoo) that is later **filled** into finished units. A filled item is linked to its bulk source; filling draws down the bulk quantity FIFO. Quantities display cleanly (no floating-point noise).

#### Approvals
The queue of pending Sell-Stock / Add-Stock requests. Approve → stock updates immediately; Reject → request cancelled.

#### Stock History
Every stock movement (purchase in, order out, fill, adjustment, discrepancy) with reference code and date.

#### Live Staff Checking
Physical stock-count sessions. A staff member counts each item with +/- controls; any discrepancy is flagged as **Known reason** (with text) or **Unknown reason**, then submitted for a manager to review and confirm. The confirmed count updates stock with a discrepancy log.

#### Kit
The kit master — what each standard kit contains, its display unit, printing and price attributes.

#### Material Stocks
Packing-material stock (boxes, pouches, paper, brushes) tracked separately from product inventory, with its own low-stock alerts.

#### Packing Material Configuration
The rules that decide, for each product or kit, which packaging line it belongs to (Box / Ziplock / Butter Paper / Wooden Brush / Other) and its default packing spec. This drives the routing in Operations and the dropdowns on Leads.

#### Damaged Report
Every quantity write-down logged from Billing's "reduce line quantity" action, with the per-line reason. Also feeds Profit & Loss ("Damaged Goods Loss") and posts a credit to the customer's ledger.

---

### 5.8 Purchase

**Route:** Purchase. Buying raw materials and packaging from vendors. Tabs:

#### Quotation & Raise Request
The procurement pipeline start.
- Raise a **bulk purchase request** — pick supplier(s), products (including additional products), quantities, payment terms.
- **Ask Quotation** — WhatsApp the request to a supplier.
- **Modify Quotation Request** — add notes / edit and resend.
- **Upload the quotation file**, then **Raise Request to Financial** for approval. A second payment reminder date is required for two-installment terms.

#### Dispatch Order Tracking
Tracking goods coming **in** from vendors against approved purchase orders.
- **Received Order** — record what physically arrived. AI-scanned invoice number, vendor name and total amount are captured alongside the line items.
- **Upload / AI-scan the vendor invoice** — auto-fills fields; CGST / SGST / **IGST** are captured separately.
- **Confirm full receipt** → inventory stock is incremented.
- **Expected Delivery** date is shown per order.
- Handles vendor "missed" scenarios — reorder or attach to an upcoming shipment.

#### Local Purchase
Ad-hoc over-the-counter buying (no formal PO). Upload the bill, enter invoice number, vendor (name + phone), total amount and item lines (item code is a dropdown). Supports **partial payment** (paid amount / Partially Paid) and raises an **escalating credit-due reminder** as the due date approaches.

#### Purchase Order History
Every purchase order, one row per consolidated batch, with payment history and quotation files attached. Exportable.

#### Quotation Comparison
Put competing vendor quotations for the same requirement side by side to choose the best price.

---

### 5.9 Vendors & Suppliers

**Route:** Vendors & Suppliers. The vendor CRM. Tabs:

#### Vendors
Raw-material suppliers. Add vendor with name, phone, email, tax ID (GST / PAN), address, **bank / UPI details** (dynamic fields), discount %.
- **View purchase history** per vendor.
- **AI vendor summary** — generate and download an AI-written profile / dealings summary.
- Update vendor status.
- The vendor's logo/hotel-name is back-filled from related leads where possible.

#### Printing Suppliers
Design / print vendors, tagged by **type** (Box / Sticker / Ziplock / Butter Paper / Wooden Brush / Other) so Operations can pick the right one for each job.

---

### 5.10 Billing

**Route:** Billing. Where quotations become invoices and payments are recorded. Tabs:

#### Quotation in Process
Confirmed orders whose quotation is waiting to be invoiced.
- **Convert to Invoice** — pulls the order composition; automatically shows the customer's **previous outstanding dues** and a Paid-Amount row so the Grand Total is correct.
- **Set a payment reminder**, **View payment proof**, **Verify payment**.

#### Invoices
All raised invoices (status Pending / Partially Paid / Paid / Overdue — overdue is automatic once past due date).
- **View / Print / Download / WhatsApp** the invoice (4 selectable themes — the **Pink** theme is Heal N Glow's standard — plus font and component toggles from Settings).
- **Edit GST** on an invoice.
- **Edit Pricing** — adjust line prices; this modal can also **reduce a line quantity** with a mandatory per-line reason, which writes a Damage Log entry, hits Profit & Loss and credits the customer's ledger.
- **Record Payment In** — amount, mode (Cash / UPI / Card / Cheque / Bank Transfer) with the mode-specific fields, plus **Courier Charge**, **Round Off** and discount. A **Payment History** audit modal shows every payment on the invoice.
- Recording a payment updates the customer ledger and flips the linked order's/task's payment status — which can **unblock dispatch**.

---

### 5.11 Ledgers

**Route:** Ledgers. Running-account statements. Tabs:

#### All Parties
Everyone with a balance — customers and vendors together.

#### Vendors Ledger / Customers Ledger
Filtered views. Each party opens a statement: Date, transaction type (Invoice / Payment / Credit Note), document reference, Debit, Credit and Running Balance — with **Download PDF** and **Print**. The party detail view has the same richness as a lead view. Parties can be deleted (soft-deleted; restorable from Settings).

---

### 5.12 Financial

**Route:** Financial. Finance's approval and payout desk. KPIs at the top: Pending Approvals, Unpaid Orders, Unpaid Expenses, Total Paid this month. Tabs:

#### Quotation Requests
Purchase requests raised by the Purchase team. Finance reviews item / supplier / amount / payment terms, adds notes, can ask the vendor via WhatsApp, and then **Approve** (creates the purchase order) or **Reject** or send back as **Modification**. **Pay Now** — enter payment details, upload proof, submit.

#### Expense Payments
General company expenses awaiting payment — pay and upload proof.

#### Reimbursement Expense
Two kinds:
- **Pickup / Reimbursement expense** — money owed to an employee who collected or dropped goods (linked to the dispatch Pick Up Order). Pay Now → record who paid → upload proof → confirm.
- **Local Purchase expense** — vendor credit dues from Local Purchase, settled here.

Once paid, the "Paid" status appears consistently on the Financial page, the Dispatch Order Tracking page and the Dispatch Pick Up Order page.

---

### 5.13 Expenses

**Route:** Expenses. The company expense register.

- Categories: **Raw Material · Shipping / Transportation · Utilities (Rent / Electricity) · Purchase · Other**.
- **Add Expense** — date, category, vendor / payee, description, amount, upload proof.
- Supports **partial payment** — total, amount paid, remaining, and a payment history table per expense.
- Filter by date range; export.

---

### 5.14 Reports

**Route:** Reports. All reports carry a rich date filter (Today, This/Last Week, Last 7 / 365 days, This/Last Month, This/Last Quarter, Current / Previous Fiscal Year) and export to **Excel (CSV)** and **PDF (print)**. See the [Reports Catalogue](#10-reports-catalogue) for what each one shows. Tabs:

Sales Report · Purchase Report · Local Purchase Report · Profit & Loss · Bill-wise P&L · Performance · Monthly GST · Forwarding & Courier Charges · Transportation Charge Report · Auditor Tax Report · Approval Report · Switch Report · Damaged Report · Task Management Performance.

---

### 5.15 Notifications

**Route:** Notifications. The in-app message centre. Tabs:

**All · Stock Alerts · Payment · Dispatch / Tasks / Orders · Purchase · Sales / Complaints**, plus **Alert Sound** settings (admins / management only).

Each notification can be marked read or deleted; the sidebar shows the unread count. A live listener plays a sound and shows a pop-up for high-priority alerts.

---

### 5.16 Integration

**Route:** Integration (sub-menu). Three connectors:

#### WhatsApp
Connects the business WhatsApp account. Manage message **templates** and the **events** that trigger an automatic WhatsApp (quotation sent, invoice raised, dispatch confirmed, follow-up reminder, ask-quotation to vendor, etc.). Event-to-template mapping, and an audit of what was sent (with a day-boundary guard so reminders don't double-fire).

#### AI Integration
Configures the AI service used for **invoice scanning** (vendor bills, lorry receipts) and **vendor summaries**. Set the model / key and the scan timeouts.

#### GST Verification
Look up and verify a GSTIN — pull the registered legal name and address to confirm a customer's or vendor's GST details before billing.

---

### 5.17 Settings

**Route:** Settings. Admin configuration. Tabs:

#### General
Company name, logo, currency, date format, address.

#### User Management
Add / edit / delete users. For each user, tick **Read / Add / Edit / Delete** per module, and switch individual **tabs** on or off. Set sales **targets and reward tiers**.

#### Notifications
Master on/off switches per notification type.

#### GST & Tax
Default GST rate, custom slabs, company GSTIN / PAN, invoice number prefix, and the tax split — **CGST + SGST for intra-state customers, IGST for inter-state customers**.

#### Invoice Settings
Four invoice **themes** (Heal N Glow's standard is the **Pink** theme), font size and style, show/hide component toggles, and the standard **terms** and **footer** text printed on invoices.

#### Alert Configuration
The rules engine for escalating alerts (see [Automation & Alert Engine](#8-automation--alert-engine)). Per alert group: enable/disable, who receives it, and a **grace period** before it fires / re-fires.

#### Snoozed Alerts
Alerts a user has temporarily silenced, with when they will return.

#### Deleted Records
Soft-deleted records (parties, etc.) — **restore** or permanently remove.

---

## 6. End-to-End Workflows

### 6.1 Lead → Payment (the main revenue flow)

1. **Sales** adds a **Lead** and works it — follow-ups, status Cold → Warm → Hot → Active.
2. **Sales** creates a **Quotation** from the lead and sends it on WhatsApp.
3. Customer negotiates → **Sales** creates a **Negotiation**; final price syncs.
4. **Sales** converts to **Order**. Payment and quotation file carry across. Operations, Tasks, Dispatch and Billing now see it.
5. **Operations** runs the order through design → client approval → printing → stock allocation → **Ops approval**, then **assigns packing tasks**.
6. **Task Management** — staff Start → Done the packing tasks; time is tracked.
7. **Billing** converts the quotation to an **Invoice** (previous dues shown automatically). Customer pays; **Finance records the payment**, ledger updates, and the order/task **payment status flips to Paid**.
8. **Dispatch** verifies each line, captures box photos, enters and uploads the invoice, and **Confirms Dispatch** — *only if payment gating is satisfied* (or the order is a SAMPLE, which bypasses it).
9. **Dispatch → Transport** — LR scanned & uploaded, tracking URL entered, **Finished Dispatch**. Sales person is auto-notified.
10. Invoice moves to **Paid**; customer balance returns to zero. Overdue invoices flag automatically.

### 6.2 Low Stock → Goods on Shelf (procurement)

1. **Inventory** flags an item below minimum (Dashboard + alert).
2. **Purchase** raises a **bulk purchase request**, WhatsApps the supplier for a quote, uploads the quotation file, and **Raises Request to Financial**.
3. **Financial** reviews and **Approves** → a **Purchase Order** is created. **Pay Now** with proof upload.
4. Supplier ships. **Purchase** uploads the **LR** (which also creates a **Pick Up Order** for the collecting employee).
5. **Purchase → Dispatch Order Tracking** — AI-scan the vendor invoice (CGST/SGST/IGST captured), **Confirm full receipt** → **inventory stock increases**.
6. If an employee collected the goods, **Financial → Reimbursement** pays them; "Paid" shows across Financial and Dispatch.

### 6.3 Reimbursement

Staff submits a claim (Staff Management) → it appears in **Financial → Reimbursement Expense** → Finance pays, records who paid, uploads proof, confirms → status becomes **Paid** everywhere it is referenced.

### 6.4 Stock-Count Discrepancy

**Inventory → Live Staff Checking** → count items → flag discrepancy as Known / Unknown reason → submit → manager confirms → stock updated with a discrepancy log entry in Stock History.

### 6.5 Emergency Dispatch

A task is urgent → staff request **Emergency Dispatch** → needs **two approvals (Sales side and Operations side)**, both given by the **Admin** role at Heal N Glow → once both are in, that quantity can dispatch ahead of the normal gates; the emergency order is highlighted in the Dispatch list.

---

## 7. Business Rules & Approval Gates

### Pipeline rules
- A lead must have a **phone number** before a quotation can be created.
- A **Negotiation** can only be created from a Quotation; an **Order** only from a Negotiation (or a direct convert).
- **Complementary** orders/invoices are recorded at ₹0 (goodwill / complaint resolution) and require a reason note.
- Invoice conversion **always** surfaces the customer's previous outstanding dues.
- Invoices past their due date become **Overdue** automatically.
- Prices are held to exact 2-decimal values — no silent rounding through the Sales → Billing → Dispatch → Purchase chain.

### Payment gating on dispatch
- An order's packing tasks inherit the order's **payment status** from Billing.
- Dispatch of an order is **blocked** until the required payment (per its payment terms) is recorded — **unless** the order is a **SAMPLE**, which bypasses all payment gating.
- Recording a payment in Billing flips the status and unblocks dispatch automatically.

### Approvals that block work
| Situation | Approval needed | Blocks? |
|---|---|---|
| Emergency dispatch of a task | Sales **and** Operations Head | Yes, until both approve |
| Kit Display Unit change | Sales **and** Operations | Yes |
| Sticker job re-routed to Box / Frosted | Dual approval | Yes |
| Dispatch LR — wrong **transporter name** | Single Sales approval | No (non-blocking) |
| Dispatch LR — wrong **package count** or **destination** | Sales **and** Operations, with a reason | Yes — "Finished Dispatch" is locked |
| Dispatch invoice / goods mismatch | Single approval to the order's salesperson | Re-upload locked until approved |
| Inventory Sell Stock / Add Stock | Manager approval from the Approvals queue | Yes — stock doesn't change until approved |
| Stock-count discrepancy | Manager confirmation | Yes |
| Purchase request → payment | Financial approval | Yes — only approved requests get paid |

> **Approver roles at Heal N Glow:** the **Admin** role acts as *both* the Sales-side approver and the Operations-side approver for every dual-approval gate above. (The system supports splitting these between different people if that changes later.)

### Financial rules
- **Payment proof (file upload) is mandatory** for every financial payout (purchase payments, reimbursements, expenses).
- A **second payment reminder date** is required for any two-installment payment term.
- Goods-receipt confirmation is what triggers the inventory stock increase — not the PO or the payment.
- Reducing an invoice line quantity **must** carry a reason and is logged as damage (P&L + ledger credit).

---

## 8. Automation & Alert Engine

**Settings → Alert Configuration** controls a set of alert "groups". For each, an admin sets: on/off, **who receives it** (a fixed team pool, or dynamically the person responsible — e.g. the task's assignee or the order's salesperson), and a **grace period** (how long to wait before firing, and before re-firing).

| Alert group | Fires when… | Goes to |
|---|---|---|
| **low_stock** | An item / material drops below minimum | Purchase / Inventory pool |
| **quotation_request** | A raised purchase request sits un-actioned | Financial |
| **consumption_forecast** | A customer is projected to run out ("Reorder Now") | Sales + Admin |
| **sample_followup** | **1 week (7 days)** after a SAMPLE order's dispatch | That order's salesperson |
| **payment_due / credit_due** | An invoice or vendor credit approaches / passes its due date | Finance (escalating) |
| **order_delivery / followup** | A delivery date or lead follow-up is due | Owner (salesperson) |
| **design** | A design request is waiting | Design staff |
| **task** | A task is unassigned / overdue | The task's assignee (dynamic) |
| **sales_approval / operations_approval** | An emergency-dispatch or routing change needs sign-off | Sales / Operations heads |
| **dispatch_reason / dispatch_status** | A dispatch mismatch reason is pending, or dispatch status stalls | Salesperson / Ops |
| **lr_payment / short_received** | LR payment outstanding, or goods short-received vs invoice | Finance / Purchase |

Scheduled background jobs run the time-based reminders (payment due, follow-up, delivery, local-purchase credit, sample follow-up), with day-boundary handling so nothing double-fires. Users can **snooze** an alert; snoozed alerts are listed in Settings.

---

## 9. Integrations & Automation Detail

### WhatsApp
- Business WhatsApp connection with reusable **message templates**.
- **Event triggers** — the system sends a WhatsApp automatically on defined events (quotation sent, invoice raised, dispatch confirmed, follow-up due, ask-quotation to a vendor, etc.). At Heal N Glow **all defined events are set to auto-send** — none are manual-only.
- Manual **"Send on WhatsApp"** buttons on quotations, negotiations, invoices, ledgers, sticker/design requests and purchase requests.
- A sent-message audit with a guard against duplicate reminders across day boundaries.

### AI
- **Invoice scanning** — vendor bills and lorry receipts are photographed or uploaded and the AI reads invoice number, date, vendor, amounts and GST components (CGST / SGST / IGST) into the form.
- **Camera capture** — a built-in webcam capture modal (not just a file picker) for LRs and vendor invoices.
- **Vendor summaries** — AI-generated vendor profile / dealings summary, downloadable.

### GST Verification
- Enter a GSTIN → retrieve the registered legal name and address to validate a customer or vendor before billing.
- The company's own GST setup (rate, slabs, CGST+SGST vs IGST split, prefix) lives in **Settings → GST & Tax**.

---

## 10. Reports Catalogue

| Report | What it shows | Notes / export |
|---|---|---|
| **Sales Report** | Monthly sales chart + GST-format table: GSTIN, taxable value, CGST, SGST, IGST, invoice value | Excel / PDF |
| **Purchase Report** | Monthly purchases + separate With-GST and Without-GST tables + product-wise GST summary (input credit) | Excel / PDF |
| **Local Purchase Report** | All local-purchase bills: total purchased, total paid, total pending, per vendor | Excel / PDF |
| **Profit & Loss** | Total sales, cost of goods (COGS), gross profit & margin %, less expenses and **Damaged Goods Loss**, = net profit. Filter by product; GST inclusive / exclusive mode | Charts + Excel / PDF |
| **Bill-wise P&L** | Per-invoice: taxable sales, GST collected, COGS, gross profit, margin % | Excel / PDF |
| **Performance** | Sales leaderboard, top performer, team revenue, average target achieved, total complaints; target vs achievement and monthly trend | Excel / PDF |
| **Monthly GST** | Output vs input GST by month with CGST / SGST / IGST columns; net GST payable | Excel / PDF |
| **Forwarding & Courier Charges** | Courier charges captured on payments, grouped by invoice date | Excel / PDF |
| **Transportation Charge Report** | Transport / lorry charges per dispatch | Excel / PDF |
| **Auditor Tax Report** | Formal sales + purchase tax statement laid out for a CA / auditor | Excel / PDF |
| **Approval Report** | Log of emergency-dispatch and other approvals (who, when, outcome) | Excel / PDF |
| **Switch Report** | Sticker → Box / Frosted routing switches and their approvals | Excel / PDF |
| **Damaged Report** | Every quantity write-down with reason, lost billing value, date | Excel / PDF |
| **Task Management Performance** | Production staff throughput, on-time %, actual vs estimated time | Excel / PDF |

---

## 11. Status Glossary

| Object | Statuses |
|---|---|
| **Lead** | Cold · Warm · Hot · Active · Dead |
| **Quotation** | Unpaid · Partially Paid · Paid · In Process |
| **Negotiation** | Unpaid · Partially Paid · Paid |
| **Order** | In Production · Dispatch Ready · Dispatched · Payment Pending · Completed · Closed · Cancelled |
| **Order payment** | Pending · Partial · Paid |
| **Invoice** | Pending · Partially Paid · Paid · Overdue |
| **Task** | Pending · In Progress · Paused · Done · Emergency |
| **Task priority** | Normal · Medium · High · Urgent |
| **Complaint** | Open · In Progress · Resolved · Closed |
| **Purchase Request** | Pending · Approved · Rejected · Modification |
| **Purchase Order — payment** | Unpaid · Partial Paid · Paid |
| **Purchase Order — dispatch** | Pending · In Transit · Received · Partially Received |
| **Dispatch record** | Draft · Confirmed · Dispatched |
| **Dispatch type** | Full Dispatch · Partial Dispatch |
| **Pickup order** | Pending · Taken · Pickup Dropped |
| **Reimbursement / Pickup payment** | Not Applicable · Pending · Partial · Paid |
| **Mismatch approvals** | none · pending · approved · rejected |
| **Operations flow** | Order Received → Sent to Design → Client Approved → Printing → Stock Received → Task Assigned |

**Document numbering:** Leads, Quotations, Negotiations, Orders, Invoices, Purchase Orders, Staff, Items and Payments each get a unique auto-generated code with a prefix.

---

## 12. Configuration Reference

Confirmed by Heal N Glow on 30 August 2026. These are the live business settings the workflows in this document assume.

| Setting | Value |
|---|---|
| **Product name** | HNG CRM |
| **Sample follow-up reminder** | Fires **1 week (7 days)** after a SAMPLE order is dispatched, to that order's salesperson |
| **Consumption-forecast usage rate** | **1 unit per room per day**, per product — the "Reorder Now" projection runs rooms × occupancy × elapsed days against this rate |
| **GST split** | **Follows the customer's location** — CGST + SGST on intra-state sales, IGST on inter-state sales |
| **Emergency-dispatch approval** | **Dual approval required**; both approvals are given by the **Admin** role |
| **Blocking-gate approvers** | The **Admin** role is both the Sales-side and Operations-side approver for every dual-approval gate (see §7) |
| **Payment terms** | The four in §2 are the complete set — no others |
| **Roles** | The role list in §3 is complete |
| **Invoice theme** | The **Pink** theme is standard for all printed invoices |
| **Reimbursement claim types** | Transport · Food · Other — complete set |
| **WhatsApp events** | **All defined events auto-send** — there are no manual-only events |
| **Process coverage** | Confirmed complete — every process the team runs today is reflected in a module above |

### Invoice terms & footer text

These are **not fixed in the software** — an administrator types them once in **Settings → Invoice Settings** and every invoice then prints them (the "Terms & Conditions" block sits above the signature line; the footer prints centred at the very bottom). Bank / UPI details print in their own block and are set separately.

**Recommended Terms & Conditions** (paste into Settings, edit to suit):

1. Goods once sold will not be taken back or exchanged.
2. Payment is due strictly as per the agreed payment terms stated on this invoice.
3. Interest at 18% per annum is chargeable on any amount not paid by its due date.
4. Goods remain the property of Heal N Glow until paid for in full.
5. Our responsibility for the goods ceases the moment they are handed to the transporter / courier. Please inspect on delivery — claims for shortage or damage must be raised in writing within 48 hours.
6. All disputes are subject to the jurisdiction of the courts at **[your city]** only.
7. This is a computer-generated invoice.

**Recommended footer line:**

> Thank you for your business. This is a computer-generated invoice and does not require a physical signature. &nbsp;|&nbsp; E. &amp; O.E.

Once these are entered in Settings, the document has no outstanding items.
