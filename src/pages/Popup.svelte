<script lang="ts">
  import { onMount } from 'svelte';
  import browser from "webextension-polyfill";
  import {defaultSettings, loadSettings, saveSettings} from "../settings/settings";

  interface Settings {
    enabled: boolean,
    coloredBadges: boolean,
  }

  // Default settings
  let settings: Settings = defaultSettings;

  // Instruction set explanations
  const instructionInfo = {
    'AVX-512': 'Advanced Vector Extensions 512-bit - SIMD instructions for heavy computation',
    'AVX': 'Advanced Vector Extensions - SIMD instructions for parallel processing',
    'SSE': 'Streaming SIMD Extensions - Earlier vector processing instructions',
    'AES': 'Advanced Encryption Standard - Hardware-accelerated encryption',
    'SHA': 'Secure Hash Algorithm - Hardware-accelerated hashing'
  };

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

  let showSavedMessage = false;
  let activeTab = 'settings';
</script>

<div class="popup-container">
  <header>
    <h1>GeekLens</h1>
    <div class="version">v0.1.0</div>
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
      ISAs
    </button>
    <button
            class:active={activeTab === 'about'}
            onclick={() => activeTab = 'about'}>
      About
    </button>
  </nav>

  <main>
    {#if activeTab === 'settings'}
      <div class="settings-panel">
        <!-- TODO add when actually checked forgi -->
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

        <button class="save-button" onclick={onSaveSettings}>
          Save Settings
        </button>

        {#if showSavedMessage}
          <div class="saved-message">Settings saved!</div>
        {/if}
      </div>

    {:else if activeTab === 'info'}
      <div class="info-panel">
        <h2>CPU Instruction Sets</h2>
        <p class="description">
          Modern CPUs support various instruction set extensions that accelerate specific types of operations.
          Geekbench uses these instruction sets to optimize benchmark performance.
        </p>

        <div class="instruction-list">
          {#each Object.entries(instructionInfo) as [type, description]}
            <div class="instruction-item">
              <span class="instruction-badge {type.toLowerCase().replace('-', '')}">
                {type}
              </span>
              <span class="instruction-desc">{description}</span>
            </div>
          {/each}
        </div>

        <div class="resources">
          <h3>Learn More</h3>
          <ul>
            <li><a href="https://en.wikipedia.org/wiki/Advanced_Vector_Extensions" target="_blank">AVX on Wikipedia</a></li>
            <li><a href="https://en.wikipedia.org/wiki/AES_instruction_set" target="_blank">AES Instructions</a></li>
            <li><a href="https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf" target="_blank">Geekbench 6 Internals</a></li>
          </ul>
        </div>
      </div>

    {:else if activeTab === 'about'}
      <div class="about-panel">
        <div class="logo">
          <img src="icons/icon128.png" alt="GeekLens Logo" width="64" height="64">
        </div>

        <h2>GeekLens v0.1.0</h2>
        <p>
          GeekLens enhances Geekbench CPU benchmark results by adding
          instruction set annotations, helping you understand which CPU
          features are being utilized in each test.
        </p>

        <div class="links">
          <a href="https://github.com/yourusername/geeklens" target="_blank">GitHub</a>
          <a href="https://github.com/yourusername/geeklens/issues" target="_blank">Report Issues</a>
        </div>

        <div class="copyright">
          © {new Date().getFullYear()} GeekLens | MIT License
        </div>
      </div>
    {/if}
  </main>
</div>

