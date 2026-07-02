import React from 'react';
import { Form, Input, Select, Row, Col } from 'antd';
import PhoneInput from './PhoneInput';
import { emailRules, phoneValidator } from '../../utils/validation';

const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
];

/**
 * Reusable "Bank Details" block for vendor/supplier add forms.
 * Renders a payment-method dropdown that swaps between bank-account
 * fields and UPI fields, all nested under `namePrefix` so antd's Form
 * collects them as a single object (e.g. values.bankDetails = {...}).
 */
export default function VendorBankFields({ form, namePrefix = 'bankDetails', labelSize = 13 }) {
  const prefix = Array.isArray(namePrefix) ? namePrefix : [namePrefix];
  const method = Form.useWatch([...prefix, 'method'], form) || 'bank';
  const labelStyle = { fontSize: labelSize };
  const fieldStyle = { borderRadius: 8, height: 40 };

  return (
    <>
      <Form.Item label={<span style={labelStyle}>Payment Method</span>} name={[...prefix, 'method']} initialValue="bank" style={{ marginBottom: 12 }}>
        <Select options={PAYMENT_METHODS} style={{ borderRadius: 8 }} />
      </Form.Item>

      {method === 'upi' ? (
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item label={<span style={labelStyle}>UPI ID</span>} name={[...prefix, 'upiId']} style={{ marginBottom: 12 }}>
              <Input placeholder="name@upi" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<span style={labelStyle}>UPI Number</span>} name={[...prefix, 'upiNumber']} style={{ marginBottom: 12 }} rules={[phoneValidator(false)]}>
              <Input placeholder="UPI-linked phone number" style={fieldStyle} />
            </Form.Item>
          </Col>
        </Row>
      ) : (
        <>
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item label={<span style={labelStyle}>Account Holder Name</span>} name={[...prefix, 'accountHolderName']} style={{ marginBottom: 12 }}>
                <Input placeholder="Account holder name" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={labelStyle}>Account Number</span>} name={[...prefix, 'accountNo']} style={{ marginBottom: 12 }}>
                <Input placeholder="Account number" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item label={<span style={labelStyle}>IFSC Code</span>} name={[...prefix, 'ifsc']} style={{ marginBottom: 12 }}>
                <Input placeholder="IFSC code" style={{ ...fieldStyle, textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={labelStyle}>Bank Name</span>} name={[...prefix, 'bankName']} style={{ marginBottom: 12 }}>
                <Input placeholder="Bank name" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={labelStyle}>Branch Name</span>} name={[...prefix, 'branchName']} style={{ marginBottom: 12 }}>
            <Input placeholder="Branch name" style={fieldStyle} />
          </Form.Item>
        </>
      )}

      <Row gutter={10}>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>Payment Contact Phone</span>} name={[...prefix, 'phone']} style={{ marginBottom: 12 }} rules={[phoneValidator(false)]}>
            <PhoneInput placeholder="Phone number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>Payment Contact Email</span>} name={[...prefix, 'email']} style={{ marginBottom: 12 }} rules={emailRules(false)}>
            <Input placeholder="payments@example.com" style={fieldStyle} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
