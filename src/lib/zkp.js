/**
 * Pure zero-knowledge-proof core — no DOM, no globals beyond WebCrypto.
 *
 * This is a *simulated* Pedersen-commitment + Fiat-Shamir scheme implemented
 * with SHA-256. The balance is consumed during construction but never appears in
 * the emitted proof string. Verification re-derives the validity hash for both
 * `broke = true` and `broke = false` and accepts whichever matches.
 *
 * Proof string format (v3):
 *   BOMPROOF:v3:T{threshold}:{commitShort}:{challengeShort}:{responseShort}:{validityHash}:{metaHash}
 *
 * Keeping this logic isolated from the DOM makes it unit-testable (see
 * test/zkp.test.js) and guarantees the cryptographic behaviour is unchanged
 * from the original inline implementation.
 */
import { sha256, randomHex } from './crypto.js';

/**
 * Construct a proof that `balance` is (or is not) strictly below `threshold`.
 *
 * @param {number} balance
 * @param {number} threshold
 * @param {{salt?: string, nonce?: string, timestamp?: number}} [overrides]
 *   Deterministic overrides for the otherwise-random salt/nonce/timestamp.
 *   Production callers pass nothing; tests inject fixed values for reproducibility.
 */
export async function buildProof(balance, threshold, overrides = {}) {
  const salt    = overrides.salt    ?? randomHex(16);
  const nonce   = overrides.nonce   ?? randomHex(8);
  const stamp   = overrides.timestamp ?? Date.now();
  const isBroke = balance < threshold;

  const commitment = await sha256('BOM_COMMIT:' + balance + ':' + salt + ':' + threshold);
  const challenge  = await sha256('BOM_CHALLENGE:' + commitment + ':' + nonce + ':' + stamp);
  const response   = await sha256('BOM_RESPONSE:' + challenge + ':' + balance + ':' + salt);

  const commitShort    = commitment.slice(0, 32);
  const challengeShort = challenge.slice(0, 16);
  const responseShort  = response.slice(0, 32);
  const validityHash   = (await sha256('BOM_VALID:' + isBroke + ':' + responseShort)).slice(0, 32);
  const metaHash       = (await sha256('BOM_META:' + commitShort + ':' + threshold + ':' + validityHash)).slice(0, 16);

  const proofStr = ['BOMPROOF', 'v3', 'T' + threshold, commitShort, challengeShort, responseShort, validityHash, metaHash].join(':');

  return {
    proofStr,
    isBroke,
    threshold,
    commitment,
    response,
    validityHash,
    commitShort,
    challengeShort,
    responseShort,
    metaHash,
    salt,
    nonce,
    timestamp: stamp,
  };
}

/**
 * Parse and verify a v3 proof string.
 *
 * @returns {Promise<{
 *   status: 'invalid_format'|'incomplete'|'tampered'|'mismatch'|'broke'|'not_broke',
 *   str: string, partsLen?: number, threshold?: number,
 *   commitment?: string, validityHash?: string
 * }>}
 */
export async function verifyProofString(str) {
  if (!str.startsWith('BOMPROOF:v3:')) {
    return { status: 'invalid_format', str };
  }

  const parts = str.split(':');
  if (parts.length < 8) {
    return { status: 'incomplete', str, partsLen: parts.length };
  }

  const threshold    = parseInt(parts[2].replace('T', ''), 10);
  const commitment   = parts[3];
  const response     = parts[5];
  const validityHash = parts[6];
  const metaHash     = parts[7];

  const expectedBroke    = (await sha256('BOM_VALID:true:' + response)).slice(0, 32);
  const expectedNotBroke = (await sha256('BOM_VALID:false:' + response)).slice(0, 32);
  const expectedMeta     = (await sha256('BOM_META:' + commitment + ':' + threshold + ':' + validityHash)).slice(0, 16);

  if (metaHash !== expectedMeta) {
    return { status: 'tampered', str, threshold, commitment, validityHash };
  }

  const isBroke    = validityHash === expectedBroke;
  const isNotBroke = validityHash === expectedNotBroke;

  if (!isBroke && !isNotBroke) {
    return { status: 'mismatch', str, threshold, commitment, validityHash };
  }

  return { status: isBroke ? 'broke' : 'not_broke', str, threshold, commitment, validityHash };
}
