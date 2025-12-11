<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";

  export type SelectProps = HTMLSelectAttributes & {
    asChild?: boolean;
  };

  let {
    asChild = false,
    class: className = "",
    children,
    ...restProps
  }: SelectProps = $props();
</script>

<select
  class={className}
  {...restProps}
>
  {@render children?.()}
</select>