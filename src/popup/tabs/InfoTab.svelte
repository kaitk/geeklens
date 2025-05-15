<script lang="ts">
  import { getCategoryStyle } from '../../isa/badgeColors';
  import { instructionCategories } from '../popupCategories';
</script>

<div class="info-panel">
  <h2>CPU Instruction Set Extensions</h2>
  <div class="description">
    <p>
      Geekbench utilizes various CPU instruction set extensions to optimize performance in
      <a href="https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf" target="_blank">some subtests</a>.
    </p>
    <p>
      GeekLens categorizes these extensions by their primary function, though this categorization is somewhat arbitrary. Some notes:
    </p>
    <ul>
      <li>Main categories have different colors</li>
      <li>Shades might differ by architectural generation.</li>
      <li>Extensions sharing registers are still colored similarly</li>
    </ul>
  </div>

  {#each Object.entries(instructionCategories) as [categoryName, category]}
    <div class="category-section">
      <h3>{categoryName}</h3>
      <p class="category-description">{category.description}</p>

      <div class="instruction-grid">
        {#each Object.entries(category.instructions) as [key, instruction]}
          <div class="instruction-card">
            <div class="instruction-header">
              <span class="instruction-badge"
                    style="background-color: {getCategoryStyle(instruction.category).backgroundColor}; color: {getCategoryStyle(instruction.type).color};">
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
    <h3>Links</h3>
    <ul>
      <li><a href="https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf" target="_blank">Geekbench 6 Internals</a></li>
      <li><a href="https://blog.theldus.moe/posts/beware-with-geekbench-v6-results" target="_blank">Geekbench 6 ISA Caveats</a></li>
    </ul>
  </div>
</div>

<style>
  .info-panel {
    padding: 0.5rem 0;
  }

  .description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .description ul {
    padding-left: 1rem;
    padding-bottom: 0;
  }

  .description a {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
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

  .resources {
    padding-top: 1rem;
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
</style>
