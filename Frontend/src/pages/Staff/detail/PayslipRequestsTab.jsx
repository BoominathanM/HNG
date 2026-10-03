// Payslip Requests tab — GET /admin/approvals/payslip?staffId={id}.
import React from 'react';
import ApprovalRequests from '../shared/ApprovalRequests';

export default function PayslipRequestsTab({ staffId }) {
  return <ApprovalRequests type="payslip" staffId={staffId} />;
}
