<script lang="ts">
  import { onMount } from 'svelte';
  import {
    defaultSettings,
    loadSettings,
    saveSettings,
    type Settings,
  } from '../../settings/settings';

  // Copied, not aliased: these checkboxes bind directly into this object.
  let settings: Settings = { ...defaultSettings };
  let showSavedMessage = false;

  // Load settings on mount
  onMount(async () => {
    settings = await loadSettings();
  });

  // Save settings
  async function onSaveSettings() {
    await saveSettings(settings);
    showSavedMessage = true;
    setTimeout(() => (showSavedMessage = false), 2000);
  }
</script>

<div class="settings-panel">
  <div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.coloredBadges} onchange={onSaveSettings} />
      Color instruction set badges
    </label>
  </div>

  <div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.tooltips} onchange={onSaveSettings} />
      Show description tooltips on hover
    </label>
  </div>

  <div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.mappingWarnings} onchange={onSaveSettings} />
      Show warnings on unconfirmed instruction mappings
    </label>
  </div>

  {#if showSavedMessage}
    <div class="saved-message">Settings saved!</div>
  {/if}
</div>
