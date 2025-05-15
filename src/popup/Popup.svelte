<script lang="ts">
  import manifest from '../manifest.json';
  import AboutTab from './tabs/AboutTab.svelte';
  import InfoTab from './tabs/InfoTab.svelte';
  import SettingsTab from './tabs/SettingsTab.svelte';

  const version = `v${manifest.version}`;
  let activeTab = 'settings';
</script>

<div class="popup-container">
  <header>
    <div><img src="/icon/icon.svg" alt="GeekLens Logo" width="32" height="32"></div>
    <h1>GeekLens</h1>
    <div class="version">{version}</div>
  </header>

  <nav class="tabs">
    <button
        class:active={activeTab === 'settings'}
        onclick={() => activeTab = 'settings'}>
      Settings
    </button>
    <button
        class:active={activeTab === 'info'}
        onclick={() => activeTab = 'info'}>
      Extensions
    </button>
    <button
        class:active={activeTab === 'about'}
        onclick={() => activeTab = 'about'}>
      About
    </button>
  </nav>

  <main>
    {#if activeTab === 'settings'}
      <SettingsTab />
    {:else if activeTab === 'info'}
      <InfoTab />
    {:else if activeTab === 'about'}
      <AboutTab />
    {/if}
  </main>
</div>

<style>
  .popup-container {
    width: 400px;
    max-height: 600px;
    font-family: system-ui, -apple-system, sans-serif;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    flex: 1;
  }

  .version {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }

  .tabs button {
    flex: 1;
    padding: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: #6b7280;
    border-bottom: 2px solid transparent;
  }

  .tabs button:hover {
    color: #374151;
  }

  .tabs button.active {
    color: #1f2937;
    border-bottom-color: #3b82f6;
  }

  main {
    padding: 1rem;
    max-height: 480px;
    overflow-y: auto;
  }
</style>
