import { browser } from '$app/environment';
import { createAuthClient } from 'better-auth/svelte';
import generatedClientConfig from './__generated__/client-config';

export const authClient = createAuthClient(generatedClientConfig);

// Re-export for convenience
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  resetPassword,
  verifyEmail,
} = authClient;

export class AuthState {
  session = $state(null);
  user = $derived(this.session?.user ?? null);
  isAuthenticated = $derived(!!this.session);
  authClient = authClient


  constructor() {
    if (browser) {
      authClient.useSession({
        onSuccess: (data) => {
          this.session = data;
        },
        onError: () => { 
          this.session = null;
        },
      });
    }
    console.log( authClient['signIn'])
    // Return a Proxy that falls back to authClient
    return new Proxy(this, {
      get(target, prop, receiver) {
        // First, check if the property exists on the AuthState instance
        if (prop in target) {
          return target[prop]
        }
        
        // If not, delegate to authClient (the dynamic proxy)
        const authValue = authClient[prop];
        
        return authValue;
      },
      
      // Optional: Make enumeration work better
      has(target, prop) {
        return prop in target || prop in authClient;
      },
      
      // Optional: Make Object.keys() work
      ownKeys(target) {
        const targetKeys = Reflect.ownKeys(target);
        // You can't enumerate the dynamic proxy, but at least show target's keys
        return targetKeys;
      }
    });
  }
}
export const authState = new AuthState()
console.log(authState)
const auth = new AuthState();
if(browser){
  

// These work from AuthState
console.log(auth.session);
console.log(auth.isAuthenticated);
// console.log(await auth.signIn)
// These are delegated to authClient's dynamic proxy
await auth.authClient.signIn?.({ email: '...', password: '...' });
await auth.signOut?.();
await auth.signUp?.({ email: '...', password: '...' });
}