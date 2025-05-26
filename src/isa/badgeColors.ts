import type { InstructionCategory } from './instructions';


export interface BadgeStyle {
  backgroundColor: string;
  color: string;
}


export const groupColors: Record<InstructionCategory, BadgeStyle> = {
  // SIMD Vector Extensions
  'SIMD_MODERN_WIDE': {
    backgroundColor: '#bfdbfe', // blue-200
    color: '#1e40af' // blue-800
  },
  'SIMD_MODERN': {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  'SIMD_LEGACY': {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  'SIMD_ML': {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  // Matrix & AI (Ambers/Oranges)
  'ML': {
    backgroundColor: '#fbbf24', // amber-400
    color: '#78350f' // amber-900
  },
  // Cryptographic (Greens)
  'CRYPTO': {
    backgroundColor: '#bbf7d0', // green-200
    color: '#166534' // green-800
  },
  // General Compute
  'OTHER': {
    backgroundColor: '#e5e7eb', // gray-200
    color: '#374151' // gray-700
  },
};


export function getCategoryStyle(type: string, colorBadges = true): BadgeStyle {
  if(!colorBadges) return groupColors['OTHER'];
  return groupColors[type as InstructionCategory] || groupColors['OTHER'];
}
