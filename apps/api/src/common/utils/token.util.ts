import { createHash, randomBytes } from 'crypto';

export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
