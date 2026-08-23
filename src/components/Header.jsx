export default function Header({ title, subtitle, right }) {
  return (
    <div style={{ background: 'var(--brand-navy)', color: '#fff', padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.25 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
