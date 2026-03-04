import type { Handle } from '@sveltejs/kit'

export function createFrameworkHandler({ hooks = [], config = {}, userHandle = null }): Handle {
  return async ({ event, resolve }) => {
    // Create a chain of hooks
    let currentResolve = resolve;
    
    // If user had original hooks, make it the last in the chain
    if (userHandle && typeof userHandle === 'function') {
      const nextResolve = currentResolve;
      currentResolve = (event) => userHandle({ event, resolve: nextResolve });
    }
    
    // Chain framework hooks in reverse order (last hook runs first)
    for (let i = hooks.length - 1; i >= 0; i--) {
      const hook = hooks[i];
      const nextResolve = currentResolve;
      currentResolve = (event) => hook({ event, resolve: nextResolve, config });
    }
    
    return currentResolve(event);
  };
}