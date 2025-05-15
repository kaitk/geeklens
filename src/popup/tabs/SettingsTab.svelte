<script lang="ts">
  import { onMount } from 'svelte';
  import { defaultSettings, loadSettings, saveSettings, type Settings } from '../../settings/settings';

  // Default settings
  let settings: Settings = defaultSettings;
  let showSavedMessage = false;

  // Load settings on mount
  onMount(async () => {
    settings = await loadSettings()
  });

  // Save settings
  async function onSaveSettings() {
    await saveSettings(settings)
    showSavedMessage = true;
    setTimeout(() => showSavedMessage = false, 2000);
  }
</script>

<div class="settings-panel">
  <!-- TODO add when actually checked for -->
  <!--div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.enabled}>
      Enable GeekLens
    </label>
  </div-->

  <div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.coloredBadges}>
      Color instruction set badges
    </label>
  </div>

  <div class="setting">
    <label>
      <input type="checkbox" bind:checked={settings.tooltips}>
      Show description tooltips on hover
    </label>
  </div>

  <button class="save-button" onclick={onSaveSettings}>
    Save Settings
  </button>

  {#if showSavedMessage}
    <div class="saved-message">Settings saved!</div>
  {/if}
</div>

<style>
  .settings-panel {
    padding: 0.5rem 0;
  }

  .setting {
    margin-bottom: 1rem;
  }

  .setting label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .save-button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .save-button:hover {
    background: #2563eb;
  }

  .saved-message {
    margin-top: 0.5rem;
    color: #059669;
    font-size: 0.875rem;
  }
</style>
