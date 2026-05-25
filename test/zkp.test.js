import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildProof, verifyProofString } from '../src/lib/zkp.js';

const FIXED = { salt: 'a'.repeat(32), nonce: 'b'.repeat(16), timestamp: 1700000000000 };

test('buildProof emits a well-formed v3 proof string', async () => {
  const { proofStr } = await buildProof(40, 50, FIXED);
  const parts = proofStr.split(':');
  assert.equal(parts.length, 8);
  assert.equal(parts[0], 'BOMPROOF');
  assert.equal(parts[1], 'v3');
  assert.equal(parts[2], 'T50');
  assert.equal(parts[3].length, 32, 'commitShort');
  assert.equal(parts[4].length, 16, 'challengeShort');
  assert.equal(parts[5].length, 32, 'responseShort');
  assert.equal(parts[6].length, 32, 'validityHash');
  assert.equal(parts[7].length, 16, 'metaHash');
});

test('buildProof is deterministic given fixed salt/nonce/timestamp', async () => {
  const a = await buildProof(40, 50, FIXED);
  const b = await buildProof(40, 50, FIXED);
  assert.equal(a.proofStr, b.proofStr);
});

test('the raw balance never appears as a delimited segment', async () => {
  const { proofStr } = await buildProof(1234, 5000, FIXED);
  // Threshold (T5000) is public; the balance 1234 must not be a segment.
  assert.ok(!proofStr.split(':').includes('1234'));
});

test('roundtrip: balance below threshold verifies as broke', async () => {
  const { proofStr } = await buildProof(40, 50);
  const r = await verifyProofString(proofStr);
  assert.equal(r.status, 'broke');
  assert.equal(r.threshold, 50);
});

test('roundtrip: balance at/above threshold verifies as not_broke', async () => {
  const { proofStr } = await buildProof(120, 50);
  const r = await verifyProofString(proofStr);
  assert.equal(r.status, 'not_broke');
  assert.equal(r.threshold, 50);
});

test('boundary: balance equal to threshold is not_broke (strictly-less semantics)', async () => {
  const { proofStr } = await buildProof(50, 50);
  const r = await verifyProofString(proofStr);
  assert.equal(r.status, 'not_broke');
});

test('tampering with the meta hash is detected', async () => {
  const { proofStr } = await buildProof(40, 50);
  const parts = proofStr.split(':');
  parts[7] = parts[7] === '0000000000000000' ? 'ffffffffffffffff' : '0000000000000000';
  const r = await verifyProofString(parts.join(':'));
  assert.equal(r.status, 'tampered');
});

test('non-BOMPROOF input is rejected as invalid format', async () => {
  const r = await verifyProofString('not a proof at all');
  assert.equal(r.status, 'invalid_format');
});

test('truncated proof string is reported as incomplete', async () => {
  const r = await verifyProofString('BOMPROOF:v3:T50:abc');
  assert.equal(r.status, 'incomplete');
  assert.equal(r.partsLen, 4);
});
