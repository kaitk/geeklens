<script lang="ts">
    import {getCategoryStyle} from '../isa/badgeColors';
    import {findDetailedDescription, type InstructionCategory} from '../isa/instructions';
    import {getSettingsStore} from '../settings/settings-store.svelte';
    import InstructionBadge from './InstructionBadge.svelte';

    interface Props {
        instructionGroups: Record<InstructionCategory, string[]>
    }

    const {instructionGroups}: Props = $props();

    let settingsStore = getSettingsStore();


    // Only show groups that have instructions
    let activeGroups = $derived(Object.entries(instructionGroups)
        .filter(([_, instructions]) => instructions.length > 0)
        .map(([type]) => type as InstructionCategory)
    );
</script>

<div class="gb-system-info-container">
  {#each activeGroups as groupType}
    <div class="gb-instruction-group">
      {#each instructionGroups[groupType] as instruction}
        <InstructionBadge
            instruction={instruction}
            groupType={groupType}
            description={settingsStore.value.coloredBadges ? findDetailedDescription(instruction) : undefined}
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
