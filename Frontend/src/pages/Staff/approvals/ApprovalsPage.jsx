// Org-wide approvals page frame — every staff member's requests of one type.
// The page title lives in ApprovalRequests' header card.
import React from 'react';
import PageBreadcrumb from '../../../components/common/PageBreadcrumb';
import ApprovalRequests from '../shared/ApprovalRequests';

export default function ApprovalsPage({ type, title }) {
  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Approvals' }, { label: title }]} />
      <ApprovalRequests type={type} />
    </div>
  );
}
