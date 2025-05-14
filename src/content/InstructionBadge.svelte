<script lang="ts">
  import { getBadgeStyle } from '../isa/badgeColors';
  import type { InstructionType } from '../isa/instructionSets';

  interface Props {
    instruction: string;
    colorBadges?: boolean;
    type: InstructionType | string;
    uppercase?: boolean;
  }

  const { instruction, type, colorBadges = true, uppercase = false }: Props = $props();
  const { backgroundColor, color } = getBadgeStyle(type, colorBadges);

</script>

<span
    class="gb-instruction-badge"
    style="background-color: {backgroundColor}; color: {color};"
>
  {uppercase ? instruction.toUpperCase() : instruction}
</span>

<style>
  .gb-instruction-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
  }
</style>
