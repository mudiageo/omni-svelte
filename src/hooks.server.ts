export async function handle({ event, resolve }) {
  // Custom user logic here
  console.log('User custom hook running');
  
  // This will be automatically chained with framework hooks
  return resolve(event);
}