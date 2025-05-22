<script lang="ts">
  import manifest from '../../manifest.json';

  const version = `v${manifest.version}`;
</script>

<div class="about-panel">
  <div class="logo">
    <img src="/icon/icon.svg" alt="GeekLens Logo" width="64" height="64">
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
