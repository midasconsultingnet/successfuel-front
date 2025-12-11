<script>
  import "../dashboard/layout.css";
  import I18nProvider from "$lib/i18n/I18nProvider.svelte";
</script>

<I18nProvider>
  <main>
    <slot />
  </main>
</I18nProvider>