import type { ProcessorVendor } from '../geekbench/resultPayload';

export type ProcessorStatus = 'engineering-sample';

export interface ProcessorPresentation {
  name: string;
  status: ProcessorStatus | null;
}

const LEGAL_MARKERS = /\((?:R|TM)\)|[®™]/gi;
const ENGINEERING_SAMPLE = /^(?:Eng(?:ineering)?\.?\s+Sample)\s*:\s*/i;

/** Produces a compact label without changing the payload value used for identity.
 * Every removal here is presentation-only and deliberately syntax-bound. */
export function processorPresentation(
  rawName: string,
  vendor: ProcessorVendor,
  physicalCores: number | null,
): ProcessorPresentation {
  let name = rawName.replaceAll(LEGAL_MARKERS, '').replaceAll(/\s+/g, ' ').trim();

  const vendorPrefix = vendor === 'unknown' ? null : new RegExp(`^${vendor}\\s+`, 'i');
  if (vendorPrefix) name = name.replace(vendorPrefix, '');

  const engineeringSample = ENGINEERING_SAMPLE.test(name);
  if (engineeringSample) name = name.replace(ENGINEERING_SAMPLE, '');

  const coreSuffix = name.match(/\s+(\d+)-Core Processor$/i);
  if (coreSuffix && physicalCores !== null && Number(coreSuffix[1]) === physicalCores) {
    name = name.slice(0, coreSuffix.index).trimEnd();
  }

  const nvidiaTopologySuffix =
    vendor === 'nvidia' ? name.match(/\s+\(\d+-core GPU,\s*(\d+)-core CPU\)$/i) : null;
  if (
    nvidiaTopologySuffix &&
    physicalCores !== null &&
    Number(nvidiaTopologySuffix[1]) === physicalCores
  ) {
    name = name.slice(0, nvidiaTopologySuffix.index).trimEnd();
  }

  return {
    name: name || rawName.trim(),
    status: engineeringSample ? 'engineering-sample' : null,
  };
}
