import { getContext, setContext } from 'svelte';
import { type ConfigurationState } from '$lib/services/ConfigurationService';

export interface ConfigurationContext {
  updateConfiguration: (newConfig: any) => void;
  getConfiguration: () => ConfigurationState | null;
}

const CONFIGURATION_CONTEXT_KEY = 'configuration-context';

export function setConfigurationContext(context: ConfigurationContext) {
  setContext(CONFIGURATION_CONTEXT_KEY, context);
}

export function getConfigurationContext(): ConfigurationContext {
  return getContext(CONFIGURATION_CONTEXT_KEY);
}