import type { InstructionType } from './instructionSets';


export interface BadgeStyle {
  backgroundColor: string;
  color: string;
}

export const badgeColors: Record<InstructionType, BadgeStyle> = {
  'AVX-512': {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  'AVX': {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  'SSE': {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  'AES': {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  'SHA': {
    backgroundColor: '#bbf7d0',
    color: '#15803d',
  },
  'NEON': {
    backgroundColor: '#fce7f3',
    color: '#831843',
  },
  'SME': {
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
  },
  'OTHER': {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
};

export function getBadgeStyle(type: string, colorBadges = true): BadgeStyle {
  if(!colorBadges) return badgeColors['OTHER'];
  return badgeColors[type as InstructionType] || badgeColors['OTHER'];
}
