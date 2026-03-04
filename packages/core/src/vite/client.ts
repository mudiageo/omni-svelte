import type { Config, HandleClientError, HandleFetch } from '@sveltejs/kit'

interface ClientHandlerConfig {
  hooks: {
    handleError?: HandleClientError
    handleFetch?: HandleFetch
  }[]
  config: any
  userHooks: null | {
    handleError?: HandleClientError
    handleFetch?: HandleFetch
  }
}
export function createClientHandler({ hooks = [], config = {}, userHooks = null }:  ClientHandlerConfig): { handleError: HandleClientError, handleFetch: HandleFetch} {
  return {
    async handleError({ error, event, status, message }) {
      // Run framework error handlers
      for (const hook of hooks) {
        if (hook.handleError) {
          await hook.handleError({ error, event, config });
        }
      }
      
      // Run original error handler if it exists
      if (userHooks?.handleError && typeof userHooks.handleError === 'function') {
        return userHooks.handleError({ error, event, status, message });
      }
      
      // Default error handling
      console.error('Omni Error:', error);
    },
    
    async handleFetch({ event, request, fetch }) {
      let currentFetch = fetch;
      
      // Chain fetch hooks
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i];
        if (hook.handleFetch) {
          const nextFetch = currentFetch;
          currentFetch = async (input, init) => hook.handleFetch({ 
            event, 
            request: input, 
            fetch: nextFetch, 
            config 
          });
        }
      }
      
      // Run original fetch handler if it exists
      if (userHooks?.handleFetch && typeof userHooks.handleFetch === 'function') {
        return userHooks.handleFetch({ event, request, fetch: currentFetch });
      }
      
      return currentFetch(request);
    }
  };
}