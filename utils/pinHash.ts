import * as Crypto from 'expo-crypto';

export async function hashPIN(pin: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
  return hash;
}

export async function verifyPIN(pin: string, hashedPIN: string): Promise<boolean> {
  const hash = await hashPIN(pin);
  return hash === hashedPIN;
}

export function isPINHashed(pin: string): boolean {
  return pin.length === 64 && /^[a-f0-9]+$/.test(pin);
}

export async function migratePINToHash(plainPIN: string): Promise<string> {
  if (isPINHashed(plainPIN)) {
    return plainPIN;
  }
  return await hashPIN(plainPIN);
}
