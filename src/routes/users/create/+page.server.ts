import type { PageServerLoad, Actions } from './$types'
import { User } from '$lib/models/user.js'
import { redirect, fail, isRedirect } from '@sveltejs/kit'

export const load: PageServerLoad = async () => {
  return {}
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData()
    const name = data.get('name')?.toString()
    const email = data.get('email')?.toString()
    const password = data.get('password')?.toString()
    const active = data.get('active') === 'on'

    // Validation
    const errors: Record<string, string> = {}
    
    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long'
    }
    
    if (!email || !email.includes('@')) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: { name, email, active } })
    }

    try {
      // Check if email already exists
      const existingUser = await locals.query.Users.where('email', email).first()
      if (existingUser) {
        return fail(400, { 
          errors: { email: 'Email already exists' }, 
          values: { name, email, active } 
        })
      }

      // Create user
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password, // In real app, hash this password
        active
      })
      redirect(303, '/users')
    } catch (error) {
      if (error instanceof Response) throw error
      if (isRedirect(error)) throw error

      console.error('Error creating user:', error)
      return fail(500, { 
        errors: { general: 'Failed to create user' },
        values: { name, email, active }
      })
    }

  }
}
