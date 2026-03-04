import type { PageServerLoad, Actions } from './$types'
import { Post } from '$lib/models/post.js'
import { User } from '$lib/models/user.js'
import { redirect, fail, isRedirect } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  try {
    const users = await locals.query.Users
      .where('active', true)
      .orderBy('name', 'asc')
      .get()

    return {
      users: users.map(user => ({ 
        id: user.getAttribute('id'), 
        name: user.getAttribute('name') 
      }))
    }
  } catch (error) {
    console.error('Error loading users:', error)
    return { users: [] }
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData()
    const title = data.get('title')?.toString()
    const content = data.get('content')?.toString()
    const user_id = data.get('user_id')?.toString()
    const published = data.get('published') === 'on'

    // Validation
    const errors: Record<string, string> = {}
    
    if (!title || title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long'
    }
    
    if (!content || content.trim().length < 10) {
      errors.content = 'Content must be at least 10 characters long'
    }
    
    if (!user_id) {
      errors.user_id = 'Please select an author'
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: { title, content, user_id, published } })
    }

    try {
      // Verify user exists
      const user = await User.find(user_id)
      if (!user) {
        return fail(400, { 
          errors: { user_id: 'Selected user not found' }, 
          values: { title, content, user_id, published } 
        })
      }

      // Create post
      const post = await Post.create({
        title: title.trim(),
        content: content.trim(),
        user_id: parseInt(user_id),
        published
      })

      redirect(303, `/posts/${post.id}`)
    } catch (error) {
      if (error instanceof Response) throw error
      if (isRedirect(error)) throw error
      
      console.error('Error creating post:', error)
      return fail(500, { 
        errors: { general: 'Failed to create post' },
        values: { title, content, user_id, published }
      })
    }
  }
}
