CREATE INDEX session_expiry ON session ("expiresAt", id);
CREATE INDEX verification_expiry ON verification ("expiresAt", id);
