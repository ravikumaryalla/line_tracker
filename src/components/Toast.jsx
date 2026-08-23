export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 14, right: 14, bottom: 78,
        background: 'var(--brand-navy)', color: '#fff', borderRadius: 10,
        padding: '13px 16px', fontSize: 14, fontWeight: 500, zIndex: 30,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,.3)',
      }}
    >
      {message}
    </div>
  );
}
