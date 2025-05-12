<script lang="ts">
  import type { InstructionType } from '../data/instructionSets';

  interface Props {
    instruction: string;
    colorBadges?: boolean;
    type: InstructionType | string;
    uppercase?: boolean;
  }

  const { instruction, type, colorBadges = true, uppercase = false }: Props = $props();

  function getBadgeClass(instructionType: InstructionType | string): string {
    switch (instructionType) {
      case 'AVX-512':
        return 'gb-instr-avx512';
      case 'AVX':
        return 'gb-instr-avx';
      case 'SSE':
        return 'gb-instr-sse';
      case 'AES':
        return 'gb-instr-aes';
      case 'SHA':
        return 'gb-instr-sha';
      default:
        return 'gb-instr-default';
    }
  }
</script>

<span class="gb-instruction-badge {colorBadges ? getBadgeClass(type) : 'gb-instr-default'}">
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

  .gb-instr-avx512 {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .gb-instr-avx {
    background-color: #e0f2fe;
    color: #0369a1;
  }

  .gb-instr-sse {
    background-color: #ffedd5;
    color: #9a3412;
  }

  .gb-instr-aes {
    background-color: #dcfce7;
    color: #166534;
  }

  .gb-instr-sha {
    background-color: #bbf7d0;
    color: #15803d;
  }

  .gb-instr-default {
    background-color: #f3f4f6;
    color: #374151;
  }
</style>
