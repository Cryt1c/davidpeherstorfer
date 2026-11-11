import type { Metadata } from 'next'
import { getAllFilesFrontMatter } from '@/lib/mdx'
import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayout'
import { pageSEO } from '@/lib/seo'
import { POSTS_PER_PAGE } from '@/lib/constants'

export const metadata: Metadata = pageSEO({
  title: `Blog - ${siteMetadata.author}`,
  description: siteMetadata.description,
})

export default async function Blog() {
  const posts = await getAllFilesFrontMatter('blog')
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE)
  const pagination = {
    currentPage: 1,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title="All Posts"
    />
  )
}
