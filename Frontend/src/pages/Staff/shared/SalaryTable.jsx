// Particulars | Per Month | Per Year table used by Salary Structure and the
// Salary Overview breakdown.
import React from 'react';
import { fmtMoney, BRAND } from './hrUtils';
import useSurface from './useSurface';

export default function SalaryTable({ figures, yearly = true, earningsTitle = '(A) EARNINGS / FIXED PAY' }) {
  const s = useSurface();
  const { earnings, extras = [], deductions, gross, totalDeductions, net } = figures;
  const cell = { padding: '10px 14px', borderBottom: `1px solid ${s.border}`, fontSize: 13.5, color: s.text };
  const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap', borderLeft: `1px solid ${s.border}` };
  const section = { ...cell, textAlign: 'center', fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, background: s.head, color: s.muted };
  const total = { fontWeight: 700, background: s.field };
  const cols = yearly ? 3 : 2;
  const money = (v) => fmtMoney(Math.round((Number(v) || 0) * 100) / 100);
  const yearOf = (l) => l.yearly ?? l.monthly * 12;

  const line = (l, i, bg) => (
    <tr key={`${l.label}-${i}`} style={{ background: bg }}>
      <td style={cell}>{l.label}</td>
      <td style={num}>{money(l.monthly)}</td>
      {yearly && <td style={num}>{money(yearOf(l))}</td>}
    </tr>
  );

  return (
    <div className="table-responsive" style={{ border: `1px solid ${s.border}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
        <thead>
          <tr style={{ background: s.head }}>
            <th style={{ ...cell, textAlign: 'left', fontSize: 11, letterSpacing: 0.8, color: s.muted }}>PARTICULARS</th>
            <th style={{ ...num, fontSize: 11, letterSpacing: 0.8, color: s.muted, width: 150 }}>PER MONTH</th>
            {yearly && <th style={{ ...num, fontSize: 11, letterSpacing: 0.8, color: s.muted, width: 150 }}>PER YEAR</th>}
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={cols} style={section}>{earningsTitle}</td></tr>
          {earnings.map((l, i) => line(l, i))}
          {extras.map((x) => (
            <React.Fragment key={x.title}>
              <tr><td colSpan={cols} style={section}>{x.title}</td></tr>
              {x.lines.map((l, i) => line(l, i))}
            </React.Fragment>
          ))}
          <tr>
            <td style={{ ...cell, ...total }}>Gross Salary (Earnings)</td>
            <td style={{ ...num, ...total }}>{money(gross)}</td>
            {yearly && <td style={{ ...num, ...total }}>{money(gross * 12)}</td>}
          </tr>
          {deductions.length > 0 && (
            <>
              <tr><td colSpan={cols} style={section}>DEDUCTIONS</td></tr>
              {deductions.map((l, i) => line(l, i, 'rgba(250,173,20,0.04)'))}
              <tr>
                <td style={{ ...cell, ...total }}>Total Deductions</td>
                <td style={{ ...num, ...total }}>{money(totalDeductions)}</td>
                {yearly && <td style={{ ...num, ...total }}>{money(totalDeductions * 12)}</td>}
              </tr>
            </>
          )}
          <tr style={{ background: 'rgba(177,30,106,0.05)' }}>
            <td style={{ ...cell, fontWeight: 700, borderTop: `2px solid ${BRAND}40`, borderBottom: 'none' }}>Net Take Home Salary per month</td>
            <td style={{ ...num, fontWeight: 700, borderTop: `2px solid ${BRAND}40`, borderBottom: 'none' }}>{money(net)}</td>
            {yearly && <td style={{ ...num, fontWeight: 700, borderTop: `2px solid ${BRAND}40`, borderBottom: 'none' }}>{money(net * 12)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
