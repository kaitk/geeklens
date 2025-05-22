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
