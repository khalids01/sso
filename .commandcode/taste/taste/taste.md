# Taste
- Prefers a plan-first workflow: investigate and produce a written architecture report, then stop and get approval before writing implementation code. Confidence: 0.95
- Wants recommendations grounded in the actual codebase — exact paths, functions, classes, and models — and explicitly dislikes guesses based on generic architecture assumptions. Confidence: 0.9
- Prefers the smallest reasonable architecture and reusing existing infrastructure (job queues, workers, DB job tables, existing signing mechanisms) over building enterprise-scale systems unless the codebase genuinely needs them. Confidence: 0.85
- Prefers emitting events/side effects from a shared central layer (one common service function or framework hook) rather than sprinkling calls across every route. Confidence: 0.8
- Prefers asynchronous, durable (outbox/queue-style) delivery for side effects so critical user/auth flows never depend on remote endpoint availability; delivery must happen only after the DB transaction commits, never inline fetch. Confidence: 0.85
- Prefers explicit safe payloads/DTOs over serializing full DB models to external consumers; external payloads must never contain secrets (password hashes, OAuth tokens, session secrets). Confidence: 0.9
- Prefers avoiding duplicate per-framework implementations when a single shared Web `Request`/`Response` abstraction suffices. Confidence: 0.7
- Prefers keeping V1 scope minimal (only required features/events) and deferring nice-to-haves such as extra event types or multi-endpoint support. Confidence: 0.6
- Prefers complex plans or instructions written to a markdown file for easier reading and future reference rather than keeping them inline in chat. Confidence: 0.9
