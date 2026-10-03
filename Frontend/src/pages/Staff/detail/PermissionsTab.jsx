// Permissions tab — GET /admin/approvals/permission?staffId={id}.
import React from 'react';
import ApprovalRequests from '../shared/ApprovalRequests';

export default function PermissionsTab({ staffId }) {
  return <ApprovalRequests type="permission" staffId={staffId} />;
}
