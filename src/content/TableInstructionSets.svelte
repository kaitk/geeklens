<script lang="ts">
  import type { Instruction } from '../isa/instructions';
  import { getSettingsStore } from '../settings/settings-store.svelte';
  import InstructionBadge from './InstructionBadge.svelte';

  interface Props {
    instructions: Instruction[];
    confidenceNote?: string;
  }

  const { instructions, confidenceNote }: Props = $props();

  let settingsStore = getSettingsStore();
</script>

<div class="gb-instruction-container">
  {#each instructions as instruction}
    <InstructionBadge
      instruction={instruction.name}
      groupType={instruction.category}
      description={settingsStore.value.tooltips ? instruction.description : undefined}
    />
  {/each}
  {#if confidenceNote}
    <button
      type="button"
      class="gb-mapping-warning"
      aria-label="Unconfirmed Geekbench 7 instruction mapping"
    >
      ⚠
      <span class="gb-mapping-warning-tooltip">{confidenceNote}</span>
    </button>
  {/if}
</div>

<style>
  .gb-instruction-container {
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .gb-mapping-warning {
    position: relative;
    color: #d97706;
    cursor: help;
    padding: 0;
    border: 0;
    background: transparent;
    font-size: 12px;
    line-height: 18px;
  }

  .gb-mapping-warning-tooltip {
    visibility: hidden;
    position: absolute;
    z-index: 1001;
    bottom: 100%;
    left: 50%;
    width: max-content;
    max-width: 20rem;
    padding: 6px 10px;
    margin-bottom: 5px;
    transform: translateX(-50%);
    border-radius: 4px;
    background-color: #92400e;
    color: white;
    font-size: 12px;
    font-weight: 400;
    text-align: center;
    white-space: normal;
  }

  .gb-mapping-warning:hover .gb-mapping-warning-tooltip,
  .gb-mapping-warning:focus .gb-mapping-warning-tooltip {
    visibility: visible;
  }
</style>
