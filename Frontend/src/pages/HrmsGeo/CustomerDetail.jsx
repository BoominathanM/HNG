// Geo customer detail — GET /admin/hrms-geo/customer/{id}; assigned staff
// names from GET /admin/hrms-geo/settings/employee-access.
import React, { useMemo } from 'react';
import { Button, Col, Row, Skeleton, Typography } from 'antd';
import { ArrowLeftOutlined, BankOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined, AimOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetGeoCustomerQuery, useGetGeoEmployeeAccessQuery } from '../../store/api/apiSlice';
import { asText, fmtDate, toList, toRecord } from '../Staff/shared/hrUtils';
import { PanelCard, SectionCard, ReadField, StatusTag, EmptyBlock, LoadError } from '../Staff/shared/StaffUi';
import useSurface from '../Staff/shared/useSurface';
import GeoMap from './shared/GeoMap';
import { latLng, fmtLatLng, mapsLink, geoInitials } from './shared/geoUtils';

const { Text, Title } = Typography;

export default function GeoCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useSurface();
  const { data, isLoading, error, refetch } = useGetGeoCustomerQuery(id);
  const { data: staffRes } = useGetGeoEmployeeAccessQuery();
  const c = toRecord(data);
  const staffById = useMemo(() => Object.fromEntries(toList(staffRes).map((e) => [e.id, e])), [staffRes]);

  const pos = latLng(c);
  const markers = useMemo(() => (pos ? [{ id: 'c', pos, label: geoInitials(c?.name), color: '#B11E6A', title: c?.name }] : []), [pos?.[0], pos?.[1], c?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const circles = useMemo(() => (pos ? [{ id: 'r', pos, radius: c?.radius || 50 }] : []), [pos?.[0], pos?.[1], c?.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => navigate('/hrms-geo/customer');
  if (isLoading) return <div className="page-container"><Skeleton active paragraph={{ rows: 8 }} /></div>;
  if (!c) {
    return (
      <div className="page-container">
        <LoadError error={error} onRetry={refetch} />
        <Button icon={<ArrowLeftOutlined />} onClick={back} style={{ marginTop: 12 }}>Back to Customers</Button>
      </div>
    );
  }

  const assigned = (c.assignedEmployees || []).map((sid) => staffById[sid] || { id: sid, name: sid });

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Customer', path: '/hrms-geo/customer' }, { label: c.name }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PanelCard bodyStyle={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={back} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title level={4} style={{ margin: 0 }}>{c.name}</Title>
              <Text style={{ color: s.muted }}><BankOutlined /> {c.companyName || '—'}</Text>
            </div>
            <StatusTag status={c.status} />
          </div>
        </PanelCard>

        <Row gutter={[14, 14]}>
          <Col xs={24} lg={13}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionCard icon={<UserOutlined />} title="Contact">
                <Row gutter={[16, 12]}>
                  <Col xs={24} md={12}><ReadField label="Customer Name" value={c.name} /></Col>
                  <Col xs={24} md={12}><ReadField label="Company" value={c.companyName} /></Col>
                  <Col xs={24} md={12}><ReadField label="Mobile" value={c.mobile} /></Col>
                  <Col xs={24} md={12}><ReadField label="Email" value={c.email} /></Col>
                  <Col xs={24} md={12}><ReadField label="Created On" value={fmtDate(c.createdDate)} /></Col>
                </Row>
              </SectionCard>
              <SectionCard icon={<EnvironmentOutlined />} title="Address & Geofence">
                <Row gutter={[16, 12]}>
                  <Col span={24}><ReadField label="Address" value={c.address} multiline /></Col>
                  <Col xs={24} md={8}><ReadField label="City" value={c.city} /></Col>
                  <Col xs={24} md={8}><ReadField label="State" value={c.state} /></Col>
                  <Col xs={24} md={8}><ReadField label="Pincode" value={c.pinCode} /></Col>
                  <Col xs={24} md={16}>
                    <ReadField label="Latitude, Longitude" value={pos && <a href={mapsLink(pos)} target="_blank" rel="noreferrer">{fmtLatLng(pos)}</a>} />
                  </Col>
                  <Col xs={24} md={8}><ReadField label="Geofence Radius" value={c.radius != null ? `${c.radius} m` : undefined} /></Col>
                </Row>
              </SectionCard>
              {(c.customFields || []).length > 0 && (
                <SectionCard icon={<AimOutlined />} title="Custom Fields">
                  <Row gutter={[16, 12]}>
                    {c.customFields.map((f, i) => (
                      <Col key={f._id || i} xs={24} md={12}>
                        <ReadField label={asText(f.label || f.name || f.fieldLabel) || `Field ${i + 1}`} value={asText(f.value ?? f.response)} />
                      </Col>
                    ))}
                  </Row>
                </SectionCard>
              )}
            </div>
          </Col>
          <Col xs={24} lg={11}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PanelCard bodyStyle={{ padding: 12 }}>
                {pos ? <GeoMap height={300} markers={markers} circles={circles} fitLabel="Recenter" />
                  : <EmptyBlock icon={<EnvironmentOutlined />} text="No location set for this customer." compact />}
              </PanelCard>
              <SectionCard icon={<TeamOutlined />} title={`Assigned Staff (${assigned.length})`}>
                {!assigned.length ? <EmptyBlock text="No staff assigned." compact /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {assigned.map((e) => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#B11E6A', background: 'rgba(177,30,106,0.1)' }}>
                          {geoInitials(e.name)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ display: 'block', color: s.text }}>{e.name}</Text>
                          <Text style={{ fontSize: 11.5, color: s.muted, fontFamily: 'monospace' }}>{[e.employeeId, e.department].filter(Boolean).join(' • ')}</Text>
                        </div>
                        {e.type && <span style={{ fontSize: 11, color: s.muted }}>{e.type}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
