# Intended API contract — draft, not implemented

No backend endpoint, route, version prefix or backend availability is promised by this document. The backend folder is a placeholder. Do not call Gemini or Firebase directly from the frontend.

## Contract workflow

Agree and document each operation before enabling its repository adapter: method/path, identifier encoding, request schema, response schema, units, nullability, error statuses, cancellation behavior and versioning. Future backend contracts should use JSON and publish a machine-readable schema (for example OpenAPI). Transport DTOs stay in infrastructure and map into domain models.

## Site architecture example

The frontend Site model currently contains only readonly string id and name. Its repository operation is getById(id, signal?). The example HTTP adapter performs a GET against an explicitly injected relative path and provisionally validates a direct JSON object with nonempty id and name strings. This is a demonstration of adapter validation, not an agreed backend wire format. No route is configured by default. Replace the provisional schema/mapping when the actual contract is agreed.

A future contract must decide response envelopes, missing-site behavior, ID format and naming constraints. No list/create/update endpoints are assumed.

## Errors and connectivity

The local ApiError shape contains kind, safe message and optional HTTP status. This is a frontend error model, not a claimed server error envelope. Future server errors should have a stable machine-readable code and safe message; correlation IDs and field validation details remain to be agreed.

An absent base URL produces unconfigured. Network/CORS failures produce network, timeouts produce timeout, cancellation produces cancelled, non-success responses produce http, and invalid data produces invalid-response. No fallback response imitates a successful request.

## Engineering operations deferred

Before simulations, planning, replanning or benchmarks are implemented, agree explicit units, validation limits, provenance, model/version metadata and uncertainty/status representation. None of these operations or their outcomes exist in this phase. Google credentials and Gemini API keys must remain exclusively on the future backend.
