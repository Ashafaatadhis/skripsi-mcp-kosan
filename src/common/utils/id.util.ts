import { v4 as uuidv4 } from 'uuid';

export function generateHumanId(prefix: string): string {
  // Ambil 6 karakter pertama dari UUID v4 untuk keunikan yang simpel namun efektif
  // Digabung dengan prefix dan angka random singkat
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampStr = Date.now().toString(36).slice(-2).toUpperCase();
  return `${prefix}-${randomStr}${timestampStr}`;
}
