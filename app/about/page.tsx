import type { Metadata } from 'next'
import { MDXLayoutRenderer } from '@/components/MDXComponents'
import { getFileBySlug } from '@/lib/mdx'
import { pageSEO } from '@/lib/seo'
import { AuthorFrontMatter } from 'types/AuthorFrontMatter'

const DEFAULT_LAYOUT = 'AuthorLayout'

export async function generateMetadata(): Promise<Metadata> {
  const authorDetails = await getFileBySlug<AuthorFrontMatter>('authors', ['default'])
  const { name } = authorDetails.frontMatter

  return pageSEO({ title: `About - ${name}`, description: `About me - ${name}` })
}

export default async function About() {
  const authorDetails = await getFileBySlug<AuthorFrontMatter>('authors', ['default'])
  const { mdxSource, frontMatter } = authorDetails

  return (
    <MDXLayoutRenderer
      layout={frontMatter.layout || DEFAULT_LAYOUT}
      mdxSource={mdxSource}
      frontMatter={frontMatter}
    />
  )
}
