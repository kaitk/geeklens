import type { GeekbenchGeneration } from './generation';

const METRIC = {
  modelIdentifier: 4,
  systemName: 5,
  motherboard: 6,
  processorIdentifier: 7,
  processorRawName: 8,
  processorName: 9,
  processorCodename: 10,
  logicalThreads: 12,
  physicalCores: 13,
  memoryCapacity: 29,
  memoryType: 30,
  clusterCount: 45,
  memoryClock: 75,
  memoryChannels: 76,
  memoryTransferRate: 87,
  instructionSets: 20_000,
} as const;

export type ProcessorArchitecture = 'x86' | 'arm' | 'risc-v' | 'unknown';
export type ProcessorVendor =
  | 'apple'
  | 'amd'
  | 'intel'
  | 'qualcomm'
  | 'nvidia'
  | 'google'
  | 'unknown';

export interface SourcedValue<T> {
  value: T;
  source: string;
}

export interface FrequencyStatistics {
  count: number;
  minMHz: number;
  q1MHz: number;
  medianMHz: number;
  meanMHz: number;
  q3MHz: number;
  maxMHz: number;
}

export interface ProcessorFrequency {
  samplesMHz: number[];
  statistics: FrequencyStatistics;
  source: 'processor_frequency.frequencies';
}

export interface MemoryMetadata {
  capacityBytes: SourcedValue<number> | null;
  type: SourcedValue<string> | null;
  clockMHz: SourcedValue<number> | null;
  transferRateMTs: SourcedValue<number> | null;
  channels: SourcedValue<number> | null;
  channelWidthBits: number | null;
  theoreticalBandwidthGBs: number | null;
}

export interface CoreCluster {
  index: number;
  label: SourcedValue<string> | null;
  cores: SourcedValue<number> | null;
  minMHz: SourcedValue<number> | null;
  maxMHz: SourcedValue<number> | null;
}

export interface ResultMetadata {
  generation: GeekbenchGeneration;
  architecture: SourcedValue<ProcessorArchitecture>;
  processor: {
    name: SourcedValue<string> | null;
    rawName: SourcedValue<string> | null;
    identifier: SourcedValue<string> | null;
    codename: SourcedValue<string> | null;
    systemName: SourcedValue<string> | null;
    modelIdentifier: SourcedValue<string> | null;
    vendor: SourcedValue<ProcessorVendor>;
  };
  instructionSets: SourcedValue<string> | null;
  scores: {
    singleCore: SourcedValue<number> | null;
    multiCore: SourcedValue<number> | null;
  };
  frequency: ProcessorFrequency | null;
  memory: MemoryMetadata;
  topology: {
    physicalCores: SourcedValue<number> | null;
    logicalThreads: SourcedValue<number> | null;
    clusters: CoreCluster[];
  };
  benchmark: {
    version: SourcedValue<string> | null;
    build: SourcedValue<number> | null;
    valid: SourcedValue<boolean> | null;
  };
}

interface GeekbenchMetric {
  id?: unknown;
  value?: unknown;
  ivalue?: unknown;
}

interface GeekbenchResultPayload {
  document_version?: unknown;
  platform?: unknown;
  processor_frequency?: unknown;
  metrics?: unknown;
  score?: unknown;
  multicore_score?: unknown;
  version?: unknown;
  build?: unknown;
  valid?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(nonEmptyString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = positiveNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function numberWithUnit(value: unknown, unit: string): number | null {
  const normalized = nonEmptyString(value);
  if (!normalized) return null;

  const match = normalized.match(new RegExp(`^([0-9]+(?:\\.[0-9]+)?)\\s*${unit}$`, 'i'));
  return match ? positiveNumber(match[1]) : null;
}

function frequencyMHz(value: unknown): number | null {
  const mhz = numberWithUnit(value, 'MHz');
  if (mhz !== null) return mhz;

  const ghz = numberWithUnit(value, 'GHz');
  return ghz !== null ? ghz * 1000 : null;
}

function metricSource(id: number): string {
  return `metric:${id}`;
}

function metricString(
  metrics: Map<number, GeekbenchMetric>,
  id: number,
): SourcedValue<string> | null {
  const value = nonEmptyString(metrics.get(id)?.value);
  return value ? { value, source: metricSource(id) } : null;
}

function metricInteger(
  metrics: Map<number, GeekbenchMetric>,
  id: number,
): SourcedValue<number> | null {
  const value = positiveInteger(metrics.get(id)?.value);
  return value !== null ? { value, source: metricSource(id) } : null;
}

function metricUnit(
  metrics: Map<number, GeekbenchMetric>,
  id: number,
  unit: string,
): SourcedValue<number> | null {
  const value = numberWithUnit(metrics.get(id)?.value, unit);
  return value !== null ? { value, source: metricSource(id) } : null;
}

function metricFrequency(
  metrics: Map<number, GeekbenchMetric>,
  id: number,
): SourcedValue<number> | null {
  const value = frequencyMHz(metrics.get(id)?.value);
  return value !== null ? { value, source: metricSource(id) } : null;
}

function architecture(value: unknown): ProcessorArchitecture {
  const normalized = nonEmptyString(value)?.toLowerCase().replaceAll('-', '_');
  if (!normalized) return 'unknown';
  if (['x86', 'x86_64', 'amd64', 'i386', 'i686'].includes(normalized)) return 'x86';
  if (['arm', 'arm64', 'aarch64'].includes(normalized)) return 'arm';
  if (normalized.startsWith('riscv') || normalized.startsWith('risc_v')) return 'risc-v';
  return 'unknown';
}

function vendorFromText(value: string): ProcessorVendor | null {
  const normalized = value.toLowerCase();
  if (normalized.includes('apple')) return 'apple';
  if (normalized.includes('authenticamd') || /\bamd\b/.test(normalized)) return 'amd';
  if (normalized.includes('genuineintel') || /\bintel\b/.test(normalized)) return 'intel';
  if (
    normalized.includes('qualcomm') ||
    normalized.includes('snapdragon') ||
    normalized.includes('oryon')
  ) {
    return 'qualcomm';
  }
  if (normalized.includes('nvidia')) return 'nvidia';
  if (normalized.includes('google') || normalized.includes('tensor')) return 'google';
  return null;
}

function classifyVendor(
  candidates: Array<SourcedValue<string> | null>,
): SourcedValue<ProcessorVendor> {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const vendor = vendorFromText(candidate.value);
    if (vendor) return { value: vendor, source: candidate.source };
  }
  return { value: 'unknown', source: 'fallback' };
}

function quantile(sorted: number[], fraction: number): number {
  // Lower-index empirical quantile: select floor((n - 1) * p) without
  // interpolation. Keeping the sampled observation is deliberate for the
  // compact box-plot view; changing methods would alter fixture expectations.
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function processorFrequency(payload: GeekbenchResultPayload): ProcessorFrequency | null {
  if (!payload.processor_frequency || typeof payload.processor_frequency !== 'object') return null;

  const frequencies = (payload.processor_frequency as { frequencies?: unknown }).frequencies;
  if (!Array.isArray(frequencies)) return null;
  const samplesMHz = frequencies
    .map(finiteNumber)
    .filter((sample): sample is number => sample !== null && sample > 0);
  if (samplesMHz.length === 0) return null;

  const sorted = samplesMHz.toSorted((a, b) => a - b);
  const mean = samplesMHz.reduce((sum, sample) => sum + sample, 0) / samplesMHz.length;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  return {
    samplesMHz,
    statistics: {
      count: samplesMHz.length,
      minMHz: sorted[0],
      q1MHz: quantile(sorted, 0.25),
      medianMHz: median,
      meanMHz: mean,
      q3MHz: quantile(sorted, 0.75),
      maxMHz: sorted.at(-1)!,
    },
    source: 'processor_frequency.frequencies',
  };
}

function memoryCapacity(metrics: Map<number, GeekbenchMetric>): SourcedValue<number> | null {
  const metric = metrics.get(METRIC.memoryCapacity);
  if (!metric) return null;

  const integerValue = positiveInteger(metric.ivalue);
  if (integerValue !== null)
    return { value: integerValue, source: metricSource(METRIC.memoryCapacity) };

  const display = nonEmptyString(metric.value);
  const match = display?.match(/^([0-9]+(?:\.[0-9]+)?)\s*(KB|MB|GB|TB)$/i);
  if (!match) return null;

  const quantity = positiveNumber(match[1]);
  if (quantity === null) return null;
  const powers: Record<string, number> = { KB: 1, MB: 2, GB: 3, TB: 4 };
  return {
    value: quantity * 1024 ** powers[match[2].toUpperCase()],
    source: metricSource(METRIC.memoryCapacity),
  };
}

function memoryMetadata(metrics: Map<number, GeekbenchMetric>): MemoryMetadata {
  const type = metricString(metrics, METRIC.memoryType);
  const clockMHz = metricFrequency(metrics, METRIC.memoryClock);
  const transferRateMTs = metricUnit(metrics, METRIC.memoryTransferRate, 'MT/s');
  const channels = metricInteger(metrics, METRIC.memoryChannels);

  let channelWidthBits: number | null = null;
  if (/^DDR5\b/i.test(type?.value ?? '')) channelWidthBits = 32;
  else if (/^DDR4\b/i.test(type?.value ?? '')) channelWidthBits = 64;

  const theoreticalBandwidthGBs =
    transferRateMTs && channels && channelWidthBits
      ? (transferRateMTs.value * channels.value * channelWidthBits) / 8 / 1000
      : null;

  return {
    capacityBytes: memoryCapacity(metrics),
    type,
    clockMHz,
    transferRateMTs,
    channels,
    channelWidthBits,
    theoreticalBandwidthGBs,
  };
}

function coreClusters(metrics: Map<number, GeekbenchMetric>): CoreCluster[] {
  const clusterCount = metricInteger(metrics, METRIC.clusterCount)?.value ?? 0;
  const clusters: CoreCluster[] = [];

  for (let index = 0; index < clusterCount; index += 1) {
    const base = 46 + index * 5;
    const label = metricString(metrics, base);
    const cores = metricInteger(metrics, base + 1);
    const minMHz = metricFrequency(metrics, base + 2);
    const maxMHz = metricFrequency(metrics, base + 3);

    if (cores) {
      clusters.push({ index: index + 1, label, cores, minMHz, maxMHz });
    }
  }

  return clusters;
}

function sourcedPositiveNumber(value: unknown, source: string): SourcedValue<number> | null {
  const parsed = positiveNumber(value);
  return parsed !== null ? { value: parsed, source } : null;
}

function sourcedBoolean(value: unknown, source: string): SourcedValue<boolean> | null {
  if (typeof value === 'boolean') return { value, source };
  if (value === 1 || value === '1' || value === 'true' || value === 'True') {
    return { value: true, source };
  }
  if (value === 0 || value === '0' || value === 'false' || value === 'False') {
    return { value: false, source };
  }
  return null;
}

export function extractResultMetadata(
  payload: unknown,
  expectedGeneration?: GeekbenchGeneration,
): ResultMetadata | null {
  if (!payload || typeof payload !== 'object') return null;
  const result = payload as GeekbenchResultPayload;
  const generation = finiteNumber(result.document_version);
  if (generation !== 6 && generation !== 7) return null;
  if (expectedGeneration !== undefined && generation !== expectedGeneration) return null;
  if (!Array.isArray(result.metrics)) return null;

  const metrics = new Map<number, GeekbenchMetric>();
  for (const candidate of result.metrics as GeekbenchMetric[]) {
    const id = finiteNumber(candidate?.id);
    if (id !== null) metrics.set(id, candidate);
  }

  const platform =
    result.platform && typeof result.platform === 'object'
      ? (result.platform as { architecture?: unknown })
      : {};
  const processorName = metricString(metrics, METRIC.processorName);
  const rawName = metricString(metrics, METRIC.processorRawName);
  const identifier = metricString(metrics, METRIC.processorIdentifier);
  const systemName = metricString(metrics, METRIC.systemName);
  const modelIdentifier = metricString(metrics, METRIC.modelIdentifier);
  const motherboard = metricString(metrics, METRIC.motherboard);
  const instructionSets = metricString(metrics, METRIC.instructionSets);

  return {
    generation,
    architecture: {
      value: architecture(platform.architecture),
      source: 'platform.architecture',
    },
    processor: {
      name: processorName ?? rawName ?? identifier,
      rawName,
      identifier,
      codename: metricString(metrics, METRIC.processorCodename),
      systemName,
      modelIdentifier,
      vendor: classifyVendor([
        processorName,
        rawName,
        identifier,
        systemName,
        modelIdentifier,
        motherboard,
      ]),
    },
    instructionSets,
    scores: {
      singleCore: sourcedPositiveNumber(result.score, 'payload.score'),
      multiCore: sourcedPositiveNumber(result.multicore_score, 'payload.multicore_score'),
    },
    frequency: processorFrequency(result),
    memory: memoryMetadata(metrics),
    topology: {
      physicalCores: metricInteger(metrics, METRIC.physicalCores),
      logicalThreads: metricInteger(metrics, METRIC.logicalThreads),
      clusters: coreClusters(metrics),
    },
    benchmark: {
      version: nonEmptyString(result.version)
        ? { value: nonEmptyString(result.version)!, source: 'payload.version' }
        : null,
      build: sourcedPositiveNumber(result.build, 'payload.build'),
      valid: sourcedBoolean(result.valid, 'payload.valid'),
    },
  };
}

export function extractInstructionSetsFromPayload(
  payload: unknown,
  expectedGeneration?: GeekbenchGeneration,
): string | null {
  return extractResultMetadata(payload, expectedGeneration)?.instructionSets?.value ?? null;
}
