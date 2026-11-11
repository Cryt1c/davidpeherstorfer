import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayout'
import { getAllFilesFrontMatter } from '@/lib/mdx'
import { getAllTags } from '@/lib/tags'
import kebabCase from '@/lib/utils/kebabCase'
import { tagSEO } from '@/lib/seo'
import { PostFrontMatter } from 'types/PostFrontMatter'

export const dynamicParams = false

export async function generateStaticParams() {
  const tags = await getAllTags('blog')
  return Object.keys(tags).map((tag) => ({
    tag,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const { tag } = await params
  return tagSEO(
    {
      title: `${tag} - ${siteMetadata.title}`,
      description: `${tag} tags - ${siteMetadata.author}`,
    },
    tag
  )
}

export default async function Tag({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const allPosts = await getAllFilesFrontMatter('blog')
  const filteredPosts: PostFrontMatter[] = allPosts.filter(
    (post) => post.draft !== true && post.tags.map((t) => kebabCase(t)).includes(tag)
  )

  // Capitalize first letter and convert space to dash
  const title = tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)

  return <ListLayout posts={filteredPosts} title={title} />
}
