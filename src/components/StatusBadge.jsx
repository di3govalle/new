// StatusBadge.jsx
// Shows whether the app is talking to mock data or a real Orchestrate server.

export default function StatusBadge({ mock }) {
  return (
    <span className={`status-badge ${mock ? "status-mock" : "status-live"}`}>
      <span className="status-dot" />
      {mock ? "Mock Mode" : "Connected Mode"}
    </span>
  );
}
