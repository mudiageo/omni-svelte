import type { PageServerLoad } from './$types'
import { User } from '$lib/models/user.js'
import { Post } from '$lib/models/post.js'

export const load: PageServerLoad = async ({ locals }) => {
  try {

    // Test direct model queries
    const totalUsers = await User.query().count()
    const totalPosts = await Post.query().count()

    // Test using locals.query for registered models
    const recentUsers = await locals.query.user
      .where('active', true)
      .orderBy('created_at', 'desc')
      .limit(5)
      .get()
    
    const publishedPosts = await locals.query.post
      .where('published', true)
      .with(['author'])
      .latest()
      .limit(3)
      .get()
    
    // Test aggregation
    const stats = await Post.query().aggregate({
      total: { fn: 'count' },
      published: { fn: 'count', column: 'published' }
    })
        
    return {
      stats: {
        totalUsers,
        totalPosts,
        publishedPosts: stats.published
      },
      recentUsers: recentUsers.map(user => user.toJSON()),
      publishedPosts: publishedPosts.map(post => post.toJSON()),
    }
  } catch (error) {
    console.error('Database error:', error)
    
    return {
      stats: {
        totalUsers: 0,
        totalPosts: 0,
        publishedPosts: 0
      },
      recentUsers: [],
      publishedPosts: [],
      error: 'Failed to load data from database'
    }
  }
}
