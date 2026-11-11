import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { getAllFilesFrontMatter } from '@/lib/mdx'
import ListLayout from '@/layouts/ListLayout'
import { pageSEO } from '@/lib/seo'
import { POSTS_PER_PAGE } from '@/lib/constants'

export const metadata: Metadata = pageSEO({
  title: `Blog - ${siteMetadata.author}`,
  description: siteMetadata.description,
})

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getAllFilesFrontMatter('blog')
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  return Array.from({ length: totalPages }, (_, i) => ({
    page: (i + 1).toString(),
  }))
}

export default async function PostPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  const posts = await getAllFilesFrontMatter('blog')
  const pageNumber = parseInt(page)
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
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
