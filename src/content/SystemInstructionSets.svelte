<script lang="ts">
  import { instructionsByName, type InstructionCategory } from '../isa/instructions';
  import type { Settings } from '../settings/settings';
  import InstructionBadge from './InstructionBadge.svelte';

  type BadgePresentationPreferences = Pick<
    Settings,
    'coloredBadges' | 'tooltips' | 'mappingWarnings'
  >;
  interface Props {
    instructionGroups: Record<InstructionCategory, string[]>;
    preferences: BadgePresentationPreferences;
  }

  const { instructionGroups, preferences }: Props = $props();

  /** Groups the system box never renders.
   *
   * SIMD_LEGACY (SSE through SSE4.1, plus FMA3) is guaranteed present on any
   * x86 CPU able to run Geekbench 6 or 7, so it is identical on every result
   * and adds nothing to a comparison. No workload mapping in benchmarkMap.ts or
   * benchmarkMapV7.ts references these either, so they can never light up a
   * per-test row. The definitions stay in instructions.ts and the popup
   * glossary still lists them.
   */
  const SUPPRESSED_GROUPS: ReadonlySet<InstructionCategory> = new Set(['SIMD_LEGACY']);

  // Only show groups that carry discriminating information
  let activeGroups = $derived(
    Object.entries(instructionGroups)
      .filter(
        ([type, instructions]) =>
          instructions.length > 0 && !SUPPRESSED_GROUPS.has(type as InstructionCategory),
      )
      .map(([type]) => type as InstructionCategory),
  );
</script>

<div class="gb-system-info-container">
  {#each activeGroups as groupType}
    <div class="gb-instruction-group">
      {#each instructionGroups[groupType] as instruction}
        <InstructionBadge
          {instruction}
          {groupType}
          coloredBadges={preferences.coloredBadges}
          description={preferences.tooltips
            ? instructionsByName[instruction]?.description
            : undefined}
        />
      {/each}
    </div>
  {/each}
</div>

<style>
  .gb-system-info-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gb-instruction-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
</style>
