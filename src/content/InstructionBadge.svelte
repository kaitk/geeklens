<script lang="ts">
import { type BadgeStyle } from '../isa/badgeColors';

interface Props {
    instruction: string;
    color: BadgeStyle,
    description?: string
}

const { instruction, color, description }: Props = $props();
const { backgroundColor, color: textColor } = color;
</script>

<span
    class="gb-instruction-badge"
    style="background-color: {backgroundColor}; color: {textColor}; cursor: {description ? 'help' : 'default'}"
>
  {instruction}
  {#if description}
    <span class="gb-instruction-tooltip">{description}</span>
  {/if}
</span>

<style>
  .gb-instruction-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    position: relative;
  }

  .gb-instruction-tooltip {
    visibility: hidden;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 5px;
    padding: 6px 10px;
    background-color: #6c757d;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    max-width: 20rem;
    width: max-content;
    text-align: center;
    white-space: normal;
    word-wrap: break-word;
  }

  .gb-instruction-tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #6c757d;
  }

  .gb-instruction-badge:hover .gb-instruction-tooltip {
    visibility: visible;
  }
</style>
