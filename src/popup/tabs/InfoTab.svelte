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
                    style="background-color: {getCategoryStyle(instruction.category).backgroundColor}; color: {getCategoryStyle(instruction.category).color};">
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
