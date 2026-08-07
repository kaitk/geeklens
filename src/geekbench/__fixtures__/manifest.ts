import type { GeekbenchGeneration } from '../generation';
import type { ProcessorArchitecture, ProcessorVendor } from '../resultPayload';

export interface ResultPayloadFixture {
  cpu: string;
  vendor: ProcessorVendor;
  architecture: ProcessorArchitecture;
  generation: GeekbenchGeneration;
  notableFor: readonly string[];
}

export const RESULT_PAYLOAD_FIXTURES = {
  '10324204': {
    cpu: 'ARM',
    vendor: 'unknown',
    architecture: 'arm',
    generation: 5,
    notableFor: ['Geekbench 5 compatibility', 'iPhone 13 mini', 'generic ARM identity'],
  },
  '1524322': {
    cpu: 'Intel Core i7-1065G7',
    vendor: 'intel',
    architecture: 'x86',
    generation: 5,
    notableFor: ['Geekbench 5 compatibility', 'Ice Lake', 'missing memory type'],
  },
  '17536185': {
    cpu: 'Intel Core i5-4670',
    vendor: 'intel',
    architecture: 'x86',
    generation: 5,
    notableFor: ['Geekbench 5 compatibility', 'Haswell', 'DDR3'],
  },
  '18449406': {
    cpu: 'AMD Ryzen 7 7700X 8-Core Processor',
    vendor: 'amd',
    architecture: 'x86',
    generation: 5,
    notableFor: ['Geekbench 5 compatibility', 'Zen 4', 'DDR5 without transfer rate'],
  },
  '18878080': {
    cpu: 'AMD Ryzen 7 5800X3D 8-Core Processor',
    vendor: 'amd',
    architecture: 'x86',
    generation: 5,
    notableFor: ['Geekbench 5 compatibility', 'Zen 3 X3D', 'DDR4 without transfer rate'],
  },
  '1248': {
    cpu: 'AMD Ryzen 7 5800X3D',
    vendor: 'amd',
    architecture: 'x86',
    generation: 7,
    notableFor: ['DDR4 bandwidth', 'usable frequency samples', 'single core cluster'],
  },
  '1262': {
    cpu: 'Apple M1 Pro',
    vendor: 'apple',
    architecture: 'arm',
    generation: 7,
    notableFor: ['older Apple cluster layout', 'capacity-only unified memory'],
  },
  '40339': {
    cpu: 'AMD Ryzen 9 3950X',
    vendor: 'amd',
    architecture: 'x86',
    generation: 7,
    notableFor: ['Zen 2', 'zero-core cluster metadata', 'missing detailed memory metadata'],
  },
  '4469': {
    cpu: 'eswin,eic770x',
    vendor: 'unknown',
    architecture: 'risc-v',
    generation: 7,
    notableFor: ['RISC-V', 'empty instruction sets', 'zero frequency samples'],
  },
  '52173': {
    cpu: 'Intel Core i9-10900K',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['pre-hybrid Intel desktop', 'zero-core cluster metadata'],
  },
  '58949': {
    cpu: 'ARM ARMv8',
    vendor: 'nvidia',
    architecture: 'arm',
    generation: 7,
    notableFor: ['vendor fallback from system name', 'generic processor name'],
  },
  '59394': {
    cpu: 'Snapdragon(R) X2 Elite Extreme - X2E94100 - Qualcomm Oryon(TM) CPU',
    vendor: 'qualcomm',
    architecture: 'arm',
    generation: 7,
    notableFor: ['Qualcomm desktop/laptop ARM', 'zero frequency samples'],
  },
  '61473': {
    cpu: 'Intel Core i9-13900K',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['pre-Arrow-Lake hybrid clusters', 'DDR5 bandwidth'],
  },
  '61506': {
    cpu: 'Intel Core i5-1035G1',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['Ice Lake laptop', 'AVX-512', 'older DDR4'],
  },
  '62238': {
    cpu: 'Intel(R) Xeon(R) w9-3575X',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['Sapphire Rapids workstation', 'AVX-512 FP16', 'AMX'],
  },
  '62440': {
    cpu: 'Intel Core i3-N305',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['efficiency-core-only Intel', 'zero-core cluster metadata'],
  },
  '64437': {
    cpu: 'Intel(R) Core(TM) Ultra 5 250K Plus',
    vendor: 'intel',
    architecture: 'x86',
    generation: 7,
    notableFor: ['Arrow Lake hybrid clusters', 'DDR5 subchannels'],
  },
  '64509': {
    cpu: 'AMD Ryzen 9 9950X3D',
    vendor: 'amd',
    architecture: 'x86',
    generation: 7,
    notableFor: ['Zen 5', 'AVX-512', 'DDR5 bandwidth'],
  },
  '64629': {
    cpu: 'Google Tensor G5',
    vendor: 'google',
    architecture: 'arm',
    generation: 7,
    notableFor: ['three frequency-labelled clusters', 'future mobile coverage'],
  },
  '64810': {
    cpu: 'Apple M5 Max',
    vendor: 'apple',
    architecture: 'arm',
    generation: 7,
    notableFor: ['unlinked Mac generation', 'capacity-only unified memory'],
  },
  '64820': {
    cpu: 'Apple M4 Pro',
    vendor: 'apple',
    architecture: 'arm',
    generation: 7,
    notableFor: ['linked Mac generation', 'capacity-only unified memory'],
  },
  '6312': {
    cpu: 'AMD Eng Sample: 100-000001535-05',
    vendor: 'amd',
    architecture: 'x86',
    generation: 7,
    notableFor: ['engineering sample', '128-core server processor'],
  },
  '18864843': {
    cpu: 'Apple M5 Max',
    vendor: 'apple',
    architecture: 'arm',
    generation: 6,
    notableFor: ['Geekbench 6 compatibility', 'Apple ARM', 'SME naming differences'],
  },
  '18873252': {
    cpu: 'AMD Ryzen 9 9950X',
    vendor: 'amd',
    architecture: 'x86',
    generation: 6,
    notableFor: ['Geekbench 6 compatibility', 'AVX-512', 'virtualized system name'],
  },
} as const satisfies Record<string, ResultPayloadFixture>;

export type ResultPayloadFixtureId = keyof typeof RESULT_PAYLOAD_FIXTURES;
