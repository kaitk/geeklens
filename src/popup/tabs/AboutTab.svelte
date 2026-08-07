<script lang="ts">
  import { extensionVersion } from '../version';
</script>

<div class="about-panel">
  <div class="logo">
    <img src="/icon/icon.svg" alt="GeekLens Logo" width="64" height="64" />
  </div>

  <h2>GeekLens {extensionVersion}</h2>
  <p>
    GeekLens adds processor, memory, score and validity context to Geekbench CPU results and
    comparisons, with instruction-set annotations where supported by available evidence.
  </p>

  <div class="links">
    <a href="https://github.com/kaitk/geeklens" target="_blank">GitHub</a>
    <a href="https://github.com/kaitk/geeklens/issues" target="_blank">Report Issues</a>
  </div>

  <div class="copyright">
    {new Date().getFullYear()} GeekLens | MIT License
  </div>
</div>
