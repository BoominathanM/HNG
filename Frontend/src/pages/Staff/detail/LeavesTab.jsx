// Leaves tab — GET /admin/approvals/leave?staffId={id}.
import React from 'react';
import ApprovalRequests from '../shared/ApprovalRequests';

export default function LeavesTab({ staffId }) {
  return <ApprovalRequests type="leave" staffId={staffId} />;
}
