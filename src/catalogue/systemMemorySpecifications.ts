import type { CatalogueSource } from './catalogue.types';

export interface SystemMemorySpecification {
  systemName: string;
  processorName: string;
  memoryType: string;
  transferRateMTs: number;
  source: CatalogueSource;
}

export const SYSTEM_MEMORY_SPECIFICATIONS: readonly SystemMemorySpecification[] = [
  {
    // Lenovo machine-type 21CQ is ThinkPad T14s Gen 3 (AMD); X13 Gen 3 (AMD) is
    // 21CM/21CN. Both ship LPDDR5-6400, which is why the earlier X13 citation
    // produced a correct value from the wrong document.
    systemName: 'LENOVO 21CQS02000',
    processorName: 'AMD Ryzen 7 PRO 6850U',
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    source: {
      url: 'https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_T14s_Gen_3_AMD/ThinkPad_T14s_Gen_3_AMD_Spec.html',
      retrievedOn: '2026-08-01',
      publisher: 'Lenovo',
    },
  },
];
