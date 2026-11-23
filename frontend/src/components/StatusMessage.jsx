export default function StatusMessage({ type = 'success', children }) {
  return (
    <p role={type === 'error' ? 'alert' : 'status'} style={{ color: type === 'error' ? '#b00020' : '#1b5e20' }}>
      {children}
    </p>
  );
}
