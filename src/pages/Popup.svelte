<script lang="ts">
  import { onMount } from 'svelte';
  import browser from "webextension-polyfill";
  import {defaultSettings, loadSettings, saveSettings} from "../settings";

  interface Settings {
    enabled: boolean,
    showBadges: boolean,
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
            on:click={() => activeTab = 'settings'}>
      Settings
    </button>
    <button
            class:active={activeTab === 'info'}
            on:click={() => activeTab = 'info'}>
      ISAs
    </button>
    <button
            class:active={activeTab === 'about'}
            on:click={() => activeTab = 'about'}>
      About
    </button>
  </nav>

  <main>
    {#if activeTab === 'settings'}
      <div class="settings-panel">
        <div class="setting">
          <label>
            <input type="checkbox" bind:checked={settings.enabled}>
            Enable GeekLens
          </label>
        </div>

        <div class="setting">
          <label>
            <input type="checkbox" bind:checked={settings.showBadges}>
            Show instruction set badges
          </label>
        </div>

        <button class="save-button" on:click={onSaveSettings}>
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
          © 2025 GeekLens | MIT License
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .popup-container {
    width: 320px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #333;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #eaeaea;
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .version {
    font-size: 12px;
    color: #666;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #eaeaea;
  }

  .tabs button {
    flex: 1;
    background: none;
    border: none;
    padding: 10px;
    font-size: 14px;
    cursor: pointer;
  }

  .tabs button.active {
    font-weight: 600;
    border-bottom: 2px solid #1e40af;
    color: #1e40af;
  }

  main {
    padding: 16px;
  }

  .setting {
    margin-bottom: 12px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  .save-button {
    width: 100%;
    padding: 10px;
    background-color: #1e40af;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 12px;
  }

  .save-button:hover {
    background-color: #1c3992;
  }

  .saved-message {
    text-align: center;
    margin-top: 8px;
    color: #16a34a;
    font-size: 14px;
  }

  .instruction-list {
    margin-top: 12px;
  }

  .instruction-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .instruction-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-right: 8px;
    min-width: 70px;
    text-align: center;
  }

  .avx512 {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .avx {
    background-color: #e0f2fe;
    color: #0369a1;
  }

  .sse {
    background-color: #ffedd5;
    color: #9a3412;
  }

  .aes {
    background-color: #dcfce7;
    color: #166534;
  }

  .sha {
    background-color: #bbf7d0;
    color: #15803d;
  }

  .instruction-desc {
    font-size: 12px;
    flex: 1;
  }

  .description {
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .resources {
    margin-top: 16px;
  }

  .resources h3 {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .resources ul {
    padding-left: 16px;
    font-size: 13px;
  }

  .resources a {
    color: #2563eb;
    text-decoration: none;
  }

  .resources a:hover {
    text-decoration: underline;
  }

  .about-panel {
    text-align: center;
  }

  .logo {
    margin-bottom: 12px;
  }

  .about-panel h2 {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .about-panel p {
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .links {
    margin-bottom: 16px;
  }

  .links a {
    display: inline-block;
    margin: 0 8px;
    color: #2563eb;
    text-decoration: none;
    font-size: 13px;
  }

  .links a:hover {
    text-decoration: underline;
  }

  .copyright {
    font-size: 12px;
    color: #666;
  }
</style>
