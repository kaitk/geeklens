import type { InstructionCategory } from './instructions';

export interface BadgeStyle {
  backgroundColor: string;
  color: string;
}

const groupColors: Record<InstructionCategory, BadgeStyle> = {
  // SIMD Vector Extensions
  SIMD_MODERN_WIDE: {
    backgroundColor: '#e8eef8',
    color: '#405b8c',
  },
  SIMD_MODERN: {
    backgroundColor: '#eaf3f7',
    color: '#3c6b7d',
  },
  SIMD_LEGACY: {
    backgroundColor: '#f6eee8',
    color: '#8a5940',
  },
  SIMD_ML: {
    backgroundColor: '#e8eef8',
    color: '#405b8c',
  },
  // Matrix & AI (Ambers/Oranges)
  ML: {
    backgroundColor: '#f7efd8',
    color: '#80651e',
  },
  // Cryptographic (Greens)
  CRYPTO: {
    backgroundColor: '#e8f3ea',
    color: '#3f7048',
  },
  // General Compute
  OTHER: {
    backgroundColor: '#eef0f2',
    color: '#59616a',
  },
};

export function getCategoryStyle(type: InstructionCategory, colorBadges = true): BadgeStyle {
  if (!colorBadges) return groupColors['OTHER'];
  return groupColors[type] || groupColors['OTHER'];
}
