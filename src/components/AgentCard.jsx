// AgentCard.jsx
// A single agent panel: a header, one or more inputs, an action button, and a
// ResponseBox for the result. The actual fields are passed in as children so
// each agent (Weather, Stock, Knowledge) can have its own inputs.

import ResponseBox from "./ResponseBox.jsx";

export default function AgentCard({
  title,
  subtitle,
  buttonLabel,
  onSubmit,
  loading,
  error,
  response,
  children,
}) {
  return (
    <section className="agent-card">
      <header className="agent-card-header">
        <h2>{title}</h2>
        {subtitle && <p className="agent-card-subtitle">{subtitle}</p>}
      </header>

      <form
        className="agent-card-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="agent-card-inputs">{children}</div>

        <button type="submit" className="agent-card-button" disabled={loading}>
          {loading ? "Working…" : buttonLabel}
        </button>
      </form>

      <ResponseBox loading={loading} error={error} response={response} />
    </section>
  );
}
