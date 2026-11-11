import type { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { getAllFilesFrontMatter } from '@/lib/mdx'
import { getAllTags } from '@/lib/tags'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllFilesFrontMatter('blog')
  const tags = await getAllTags('blog')

  const routes = ['', '/blog', '/tags', '/about', '/projects'].map((route) => ({
    url: `${siteMetadata.siteUrl}${route}`,
  }))

  const blogUrls = posts.map((post) => ({
    url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
    lastModified: post.date,
  }))

  const tagUrls = Object.keys(tags).map((tag) => ({
    url: `${siteMetadata.siteUrl}/tags/${tag}`,
  }))

  return [...routes, ...blogUrls, ...tagUrls]
}
