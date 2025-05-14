<script lang="ts">
  import { onMount } from 'svelte';
  import { getBadgeStyle } from '../isa/badgeColors';
  import { instructionCategories } from '../isa/categories';
  import { defaultSettings, loadSettings, saveSettings, type Settings } from '../settings/settings';


  // Default settings
  let settings: Settings = defaultSettings;

  const version = 'v0.1.3';


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
    <div><img src="/icon2.svg" alt="GeekLens Logo" width="32" height="32"></div>
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

        <button class="save-button" onclick={onSaveSettings}>
          Save Settings
        </button>

        {#if showSavedMessage}
          <div class="saved-message">Settings saved!</div>
        {/if}
      </div>

    {:else if activeTab === 'info'}
      <div class="info-panel">
        <h2>CPU Instruction Set Extensions</h2>
        <p class="description">
          Geekbench utilizes various CPU instruction set extensions to optimize performance.
          These extensions are grouped below by their primary function, though this categorization
          is somewhat arbitrary as some instructions serve multiple purposes.
        </p>

        {#each Object.entries(instructionCategories) as [categoryName, category]}
          <div class="category-section">
            <h3>{categoryName}</h3>
            <p class="category-description">{category.description}</p>

            <div class="instruction-grid">
              {#each Object.entries(category.instructions) as [key, instruction]}
                <div class="instruction-card">
                  <div class="instruction-header">
                    <span class="instruction-badge"
                          style="background-color: {getBadgeStyle(instruction.type).backgroundColor}; color: {getBadgeStyle(instruction.type).color};">
                      {key}
                    </span>
                    <span class="architecture-badge">{instruction.architecture}</span>
                  </div>
                  <div class="instruction-name">{instruction.name}</div>
                  <div class="instruction-description">{instruction.description}</div>
                </div>
              {/each}
            </div>
          </div>
        {/each}

        <div class="resources">
          <h3>Learn More</h3>
          <ul>
            <li><a href="https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf" target="_blank">Geekbench 6 Internals</a></li>
            <li><a href="https://blog.theldus.moe/posts/beware-with-geekbench-v6-results" target="_blank">Geekbench 6 ISA Caveats</a></li>
          </ul>
        </div>
      </div>

    {:else if activeTab === 'about'}
      <div class="about-panel">
        <div class="logo">
          <img src="/icon2.svg" alt="GeekLens Logo" width="64" height="64">
        </div>

        <h2>GeekLens {version}</h2>
        <p>
          GeekLens enhances Geekbench CPU benchmark results by adding
          instruction set annotations, helping you understand which CPU
          features are being utilized in each test.
        </p>

        <div class="links">
          <a href="https://github.com/kaitk/geeklens" target="_blank">GitHub</a>
          <a href="https://github.com/kaitk/geeklens/issues" target="_blank">Report Issues</a>
        </div>

        <div class="copyright">
          {new Date().getFullYear()} GeekLens | MIT License
        </div>
      </div>
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

  .info-panel {
    padding: 0.5rem 0;
  }

  .description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .category-section {
    margin-bottom: 2rem;
  }

  .category-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  .category-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .instruction-grid {
    display: grid;
    gap: 0.75rem;
  }

  .instruction-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.75rem;
  }

  .instruction-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .instruction-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .architecture-badge {
    font-size: 11px;
    color: #6b7280;
    background: #e5e7eb;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .instruction-name {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .instruction-description {
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* Default fallback is handled by badgeColors.ts */

  .resources {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .resources h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .resources ul {
    list-style: none;
    padding: 0;
  }

  .resources li {
    margin-bottom: 0.5rem;
  }

  .resources a {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .resources a:hover {
    text-decoration: underline;
  }

  .about-panel {
    text-align: center;
    padding: 2rem 0;
  }

  .logo {
    margin-bottom: 1rem;
  }

  .about-panel h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .about-panel p {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .links {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .links a {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .links a:hover {
    text-decoration: underline;
  }

  .copyright {
    color: #9ca3af;
    font-size: 0.75rem;
  }
</style>
