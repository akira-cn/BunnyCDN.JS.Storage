import crypto from 'node:crypto';

export function generateChecksum(str, algorithm = 'sha256', encoding = 'hex') {
  return crypto
      .createHash(algorithm)
      .update(str, 'utf8')
      .digest(encoding || 'hex');
}