<script lang="ts">
  import Calendar from '../calendar/calendar.svelte';
  import * as Popover from '../popover/index';
  import { Button } from '../button';
  import { cn } from '$lib/utils';
  import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
  import { format } from 'date-fns';
  import { fr, enUS } from 'date-fns/locale';

  type DatePickerProps = {
    class?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    date?: Date;
    onDateChange?: (date: Date | undefined) => void;
  };

  let {
    class: className = '',
    id: id = 'date-picker',
    placeholder = 'Sélectionnez une date',
    disabled = false,
    date,
    onDateChange
  }: DatePickerProps = $props();

  let open = $state(false);
  let internalValue = $state<CalendarDate | undefined>();

  // Fonction pour obtenir le locale depuis le localStorage
  const getLocale = () => {
    const lang = localStorage.getItem('language') || 'fr';
    return lang === 'fr' ? fr : enUS;
  };

  $effect(() => {
    // Synchroniser la date initiale si elle change
    if (date) {
      internalValue = new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    } else {
      internalValue = undefined;
    }
  });

  const handleValueChange = (newValue: any) => {
    if (newValue) {
      internalValue = newValue;
      // Convertir la date sélectionnée en objet Date JS
      const jsDate = newValue.toDate(getLocalTimeZone());
      onDateChange?.(jsDate);
    }
    open = false;
  };
</script>

<div class={cn("grid gap-2", className)}>
 <Popover.Root bind:open>
  <Popover.Trigger>
   {#snippet child({ props })}
    <Button
     {...props}
     variant="outline"
     class={cn(
       "w-full justify-start text-left font-normal",
       !internalValue && "text-muted-foreground",
       className
     )}
     disabled={disabled}
    >
     {internalValue
      ? format(internalValue.toDate(getLocalTimeZone()), 'PPP', { locale: getLocale() })
      : placeholder}
    </Button>
   {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto overflow-hidden p-0" align="start">
   <Calendar
    type="single"
    bind:value={internalValue}
    onValueChange={handleValueChange}
    initialFocus
   />
  </Popover.Content>
 </Popover.Root>
</div>