// ResponseBox.jsx
// A terminal/chat-style panel that shows the agent's reply, a loading state,
// errors, and any citations returned from a knowledge base.

export default function ResponseBox({ loading, error, response }) {
  return (
    <div className="response-box">
      {loading && (
        <div className="response-loading">
          <span className="spinner" />
          Waiting for the agent…
        </div>
      )}

      {!loading && error && (
        <div className="response-error">
          <strong>⚠ Something went wrong</strong>
          <pre>{error}</pre>
        </div>
      )}

      {!loading && !error && response && (
        <div className="response-content">
          <pre className="response-text">{response.text}</pre>

          {/* Citation area is always rendered so the layout is stable, even
              when there are no citations yet. */}
          <div className="citations">
            <span className="citations-label">Citations</span>
            {response.citations && response.citations.length > 0 ? (
              <ul>
                {response.citations.map((c, i) => (
                  <li key={i}>
                    {c.title || c.url || c.text || JSON.stringify(c)}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="citations-empty">No citations yet.</span>
            )}
          </div>
        </div>
      )}

      {!loading && !error && !response && (
        <div className="response-placeholder">
          The agent's response will appear here.
        </div>
      )}
    </div>
  );
}
