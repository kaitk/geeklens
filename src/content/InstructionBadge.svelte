<script lang="ts">
  import { getCategoryStyle } from '../isa/badgeColors';
  import type { InstructionCategory } from '../isa/instructions';

  interface Props {
    instruction: string;
    groupType: InstructionCategory;
    description?: string;
    coloredBadges: boolean;
  }

  const { instruction, groupType, description, coloredBadges }: Props = $props();
  const tooltipId = `geeklens-instruction-tooltip-${crypto.randomUUID()}`;

  const { backgroundColor, color } = $derived(getCategoryStyle(groupType, coloredBadges));

  /** Escape closes the CSS-only tooltip by removing its focus trigger. */
  function dismissTooltip(event: KeyboardEvent): void {
    if (event.key === 'Escape') (event.currentTarget as HTMLButtonElement).blur();
  }
</script>

{#if description}
  <!-- Keep the description outside the button so it augments, rather than
       becoming part of, the button's accessible name. -->
  <span class="gb-instruction-badge-tooltip-anchor">
    <button
      type="button"
      class="gb-instruction-badge"
      aria-describedby={tooltipId}
      onkeydown={dismissTooltip}
      style="background-color: {backgroundColor}; color: {color}; cursor: help"
      >{instruction}</button
    >
    <span id={tooltipId} role="tooltip" class="gb-instruction-tooltip">{description}</span>
  </span>
{:else}
  <span
    class="gb-instruction-badge"
    style="background-color: {backgroundColor}; color: {color}; cursor: default"
  >
    {instruction}
  </span>
{/if}

<style>
  .gb-instruction-badge {
    display: inline-block;
    box-sizing: border-box;
    min-height: 18px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    border: 0;
    font-family: inherit;
    line-height: inherit;
  }

  .gb-instruction-badge-tooltip-anchor {
    display: inline-block;
    position: relative;
  }

  .gb-instruction-tooltip {
    opacity: 80%;
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
    word-break: normal;
    overflow-wrap: break-word;
    hyphens: auto;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
  }

  .gb-instruction-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #6c757d;
  }

  .gb-instruction-badge-tooltip-anchor:hover .gb-instruction-tooltip,
  .gb-instruction-badge-tooltip-anchor:focus-within .gb-instruction-tooltip {
    visibility: visible;
  }

  .gb-instruction-badge:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style>
