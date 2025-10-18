// import { auth } from "./auth.server";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";

let auth;

export async function authHandle({ event, resolve }) {
  
  //dynamically import to emsure database is initialised first
  if(!auth) auth = (await import('./auth.server')).auth
  
  // Fetch current session from Better Auth
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  // Make session and user available on server
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }
  
  //make auth accessible anywhere lpvals is accessible 
  event.locals.auth = auth;
  
  return svelteKitHandler({ event, resolve, auth, building });
}