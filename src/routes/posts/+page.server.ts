import type { PageServerLoad, Actions } from './$types'
import { Post } from '$lib/models/post.js'
import { fail } from '@sveltejs/kit'
import { parsePagination } from '$pkg'


export const load: PageServerLoad = async ({ locals, url }) => {
  let { page, limit: perPage } = parsePagination(url)
  perPage = perPage || 10
  
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''

  try {
    let query = locals.query.Posts.with(['author'])

    if (search) {
      query = query.where('title', 'ilike', `%${search}%`)
        .orWhere('content', 'ilike', `%${search}%`)
    }

    if (status === 'published') {
      query = query.where('published', true)
    } else if (status === 'draft') {
      query = query.where('published', false)
    }

    const postsPaginated = await query
      .orderBy('created_at', 'desc')
      .paginate(perPage, page)

    return {
      posts: {
        ...postsPaginated,
        data: postsPaginated.data.map(post => post.toJSON())
      },
      search,
      status
    }
  } catch (error) {
    console.error('Error loading posts:', error)
    return {
      posts: {
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
      status,
      error: 'Failed to load posts'
    }
  }
}

export const actions: Actions = {
  delete: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id')

    if (!id) {
      return fail(400, { error: 'Post ID is required' })
    }

    try {
      const post = await Post.find(id)
      if (!post) {
        return fail(404, { error: 'Post not found' })
      }

      await post.delete()
      return { success: true, message: 'Post deleted successfully' }
    } catch (error) {
      console.error('Error deleting post:', error)
      return fail(500, { error: 'Failed to delete post' })
    }
  },

  toggle_published: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id')

    if (!id) {
      return fail(400, { error: 'Post ID is required' })
    }

    try {
      const post = await Post.find(id)
      if (!post) {
        return fail(404, { error: 'Post not found' })
      }

      post.setAttribute('published', !post.getAttribute('published'))
      await post.save()

      return { success: true, message: 'Post status updated' }
    } catch (error) {
      console.error('Error updating post:', error)
      return fail(500, { error: 'Failed to update post' })
    }
  }
}
