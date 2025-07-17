import type { PageServerLoad, Actions } from './$types'
import { User } from '$lib/models/user.js'
import { fail } from '@sveltejs/kit'
import { parsePagination } from '$pkg'

export const load: PageServerLoad = async ({ locals, url }) => {
  let { page, limit: perPage } = parsePagination(url)
  
  const search = url.searchParams.get('search') || ''
  perPage = perPage || 10

  try {
    let query = locals.query.Users

    if (search) {
      query = query.search(search, ['name', 'email'])
    }

    const usersPaginated = await query
      .orderBy('created_at', 'desc')
      .paginate(perPage, page)

    return {
      users: {
        ...usersPaginated,
        data: usersPaginated.data.map(user => user.toJSON())
      },
      search
    }
  } catch (error) {
    console.error('Error loading users:', error)
    return {
      users: {
        data: [],
        meta: {
          current_page: 1,
          per_page: perPage,
          total: 0,
          last_page: 0,
          from: 0,
          to: 0,
          has_more: false,
          links: { first: 1, last: 0, prev: null, next: null }
        }
      },
      search,
      error: 'Failed to load users'
    }
  }
}

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    const data = await request.formData()
    const id = data.get('id')

    if (!id) {
      return fail(400, { error: 'User ID is required' })
    }

    try {
      const user = await User.find(id)
      if (!user) {
        return fail(404, { error: 'User not found' })
      }

      await user.delete()
      return { success: true, message: 'User deleted successfully' }
    } catch (error) {
      console.error('Error deleting user:', error)
      return fail(500, { error: 'Failed to delete user' })
    }
  },

  toggle_active: async ({ request, locals }) => {
    const data = await request.formData()
    const id = data.get('id')

    if (!id) {
      return fail(400, { error: 'User ID is required' })
    }

    try {
      const user = await User.find(id)
      if (!user) {
        return fail(404, { error: 'User not found' })
      }

      user.setAttribute('active', !user.getAttribute('active'))
      await user.save()

      return { success: true, message: 'User status updated' }
    } catch (error) {
      console.error('Error updating user:', error)
      return fail(500, { error: 'Failed to update user' })
    }
  }
}
