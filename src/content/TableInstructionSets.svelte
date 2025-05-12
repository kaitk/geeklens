<script lang="ts">
  import type { Instruction } from '../data/instructionSets';
  import InstructionBadge from './InstructionBadge.svelte';

  interface Props {
    instructions: Instruction[]
  }

  const { instructions }: Props = $props();
</script>

<div class="gb-instruction-container">
  {#each instructions as instruction}
    <InstructionBadge
        instruction={instruction.name}
        type={instruction.type}
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
