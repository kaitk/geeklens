<script lang="ts">
  import { getCategoryStyle } from '../isa/badgeColors';
  import type { Instruction } from '../isa/instructions';
  import { getSettingsStore } from '../settings/settings-store.svelte';
  import InstructionBadge from './InstructionBadge.svelte';

  interface Props {
    instructions: Instruction[]
  }

  const { instructions }: Props = $props();

  let settingsStore = getSettingsStore();
</script>

<div class="gb-instruction-container">
  {#each instructions as instruction}
    <InstructionBadge
        instruction={instruction.name}
        color={getCategoryStyle(instruction.category, settingsStore.value.coloredBadges)}
        description={ settingsStore.value.tooltips ? instruction?.description : undefined}
    />
  {/each}
</div>

<style>
  .gb-instruction-container {
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
</style>
