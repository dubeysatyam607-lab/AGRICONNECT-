/**
 * Shared security configuration for the AgriConnect backend.
 * Resolves the JWT signing secret with a fail-fast policy: a hardcoded
 * default secret is never used, because it would let anyone forge tokens.
 */
const crypto = require('crypto');

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production.');
    process.exit(1);
  }

  // Development: generate an ephemeral per-boot secret so sessions cannot be
  // forged with a known default, at the cost of invalidating tokens on restart.
  return crypto.randomBytes(48).toString('hex');
}

module.exports = { JWT_SECRET: resolveJwtSecret() };
