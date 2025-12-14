<script lang="ts">
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import StationList from '$lib/components/Structure/StationList.svelte';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
</script>

<div class="container mx-auto py-6">
  <StationList />
</div>