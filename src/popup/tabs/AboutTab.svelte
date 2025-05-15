<script lang="ts">
  import manifest from '../../manifest.json';

  const version = `v${manifest.version}`;
</script>

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

<style>
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
