import { mount } from 'svelte';
import type { Instruction } from '../isa/instructions';
import type { InstructionCategory } from '../isa/instructions';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';

/**
 * Svelte components are always mounted into a container element of our own
 * rather than directly into a Geekbench cell, so mounting never clobbers
 * markup the page owns.
 */
function containerIn(cell: Element, marker: string): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute(marker, '');
  cell.appendChild(container);
  return container;
}

export function mountSystemInstructionSets(
  cell: Element,
  instructionGroups: Record<InstructionCategory, string[]>,
) {
  mount(SystemInstructionSetsComponent, {
    target: containerIn(cell, 'data-geeklens-system-info'),
    props: { instructionGroups },
  });
}

export function mountWorkloadBadges(
  cell: Element,
  instructions: Instruction[],
  confidenceNote?: string,
) {
  mount(TableInstructionSetsComponent, {
    target: containerIn(cell, 'data-geeklens-instructions'),
    props: { instructions, confidenceNote },
  });
}
