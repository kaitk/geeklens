<script lang="ts">
  import { onMount } from 'svelte';
  import browser from '../../browserApi';
  import {
    defaultSettings,
    loadSettings,
    saveSettings,
    type Settings,
  } from '../../settings/settings';

  // Copied, not aliased: these checkboxes bind directly into this object.
  let settings: Settings = $state({ ...defaultSettings });
  let savedSettings: Settings = $state({ ...defaultSettings });
  let showSavedMessage = $state(false);
  let isSaving = $state(false);
  let hasChanges = $derived(JSON.stringify(settings) !== JSON.stringify(savedSettings));

  // Load settings on mount
  onMount(async () => {
    settings = await loadSettings();
    savedSettings = { ...settings };
  });

  // Save settings
  async function onSaveSettings() {
    if (!hasChanges || isSaving) return;
    isSaving = true;
    await saveSettings(settings);
    savedSettings = { ...settings };
    showSavedMessage = true;
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id && activeTab.url?.startsWith('https://browser.geekbench.com/')) {
      await browser.tabs.reload(activeTab.id);
    }
    isSaving = false;
    setTimeout(() => (showSavedMessage = false), 1800);
  }
</script>

<div class="settings-panel">
  <section class="settings-group">
    <div class="settings-group-heading">
      <h2>Data shown</h2>
      <p>Choose which GeekLens additions appear on result pages.</p>
    </div>

    <label class="setting-row">
      <span
        ><strong>Reference averages</strong><small>Geekbench Browser averages and deltas</small
        ></span
      >
      <input type="checkbox" bind:checked={settings.showReferenceComparison} />
    </label>
    <label class="setting-row">
      <span
        ><strong>Multi-core scaling</strong><small
          >Multi-core to single-core score ratio, beside the score</small
        ></span
      >
      <input type="checkbox" bind:checked={settings.showMultiCoreScaling} />
    </label>
    <label class="setting-row">
      <span
        ><strong>Processor identity</strong><small>Vendor, ISA family, and catalogue link</small
        ></span
      >
      <input type="checkbox" bind:checked={settings.showProcessorSummary} />
    </label>
    <label class="setting-row">
      <span><strong>Core topology</strong><small>Core, thread, and cluster layout</small></span>
      <input type="checkbox" bind:checked={settings.showCoreTopology} />
    </label>
    <label class="setting-row">
      <span
        ><strong>Frequency distribution</strong><small>Geekbench frequency sample summary</small
        ></span
      >
      <input type="checkbox" bind:checked={settings.showFrequencyDistribution} />
    </label>
    <label class="setting-row">
      <span
        ><strong>Memory details</strong><small>Reported, computed, and published facts</small></span
      >
      <input type="checkbox" bind:checked={settings.showMemoryDetails} />
    </label>
    <label class="setting-row">
      <span
        ><strong>ISA annotations</strong><small>System and per-workload instruction sets</small
        ></span
      >
      <input type="checkbox" bind:checked={settings.showIsaAnnotations} />
    </label>
  </section>

  <section class="settings-group">
    <div class="settings-group-heading">
      <h2>Badge preferences</h2>
      <p>Control the appearance and supporting detail of all GeekLens additions.</p>
    </div>

    <label class="setting-row compact">
      <span><strong>Badge colors</strong></span>
      <input type="checkbox" bind:checked={settings.coloredBadges} />
    </label>
    <label class="setting-row compact">
      <span><strong>Tooltips</strong></span>
      <input type="checkbox" bind:checked={settings.tooltips} />
    </label>
    <label class="setting-row compact">
      <span><strong>Unconfirmed mapping warnings</strong></span>
      <input type="checkbox" bind:checked={settings.mappingWarnings} />
    </label>
  </section>

  <div class="settings-actions">
    <span class="settings-status">
      {#if showSavedMessage}Saved and page refreshed{/if}
    </span>
    {#if hasChanges}
      <button class="save-settings" type="button" onclick={onSaveSettings} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save changes'}
      </button>
    {/if}
  </div>
</div>
