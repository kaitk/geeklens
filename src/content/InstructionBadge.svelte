<script lang="ts">
  import { type BadgeStyle } from '../isa/badgeColors';

  interface Props {
    instruction: string;
    color: BadgeStyle,
  }

  const { instruction, color }: Props = $props();
  const { backgroundColor, color: textColor } = color;
</script>

<span
    class="gb-instruction-badge"
    style="background-color: {backgroundColor}; color: {textColor};"
>
  {instruction}
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
