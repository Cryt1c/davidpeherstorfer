import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageTitle from '@/components/PageTitle'
import JsonLd from '@/components/JsonLd'
import { MDXLayoutRenderer } from '@/components/MDXComponents'
import { formatSlug, getAllFilesFrontMatter, getFileBySlug, getFiles } from '@/lib/mdx'
import { blogSEO, blogStructuredData } from '@/lib/seo'
import siteMetadata from '@/data/siteMetadata'
import { AuthorFrontMatter } from 'types/AuthorFrontMatter'
import { PostFrontMatter } from 'types/PostFrontMatter'

const DEFAULT_LAYOUT = 'PostLayout'

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = getFiles('blog')
  return posts.map((p) => ({
    slug: formatSlug(p).split('/'),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getFileBySlug<PostFrontMatter>('blog', slug.join('/'))
  const url = `${siteMetadata.siteUrl}/blog/${slug.join('/')}`

  return blogSEO({ ...post.frontMatter, url })
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const slugString = slug.join('/')

  const allPosts = await getAllFilesFrontMatter('blog')
  const postIndex = allPosts.findIndex((post) => formatSlug(post.slug) === slugString)
  const prev: { slug: string; title: string } = allPosts[postIndex + 1] || null
  const next: { slug: string; title: string } = allPosts[postIndex - 1] || null
  const post = await getFileBySlug<PostFrontMatter>('blog', slugString)

  const authorList = post.frontMatter.authors || ['default']
  const authorDetails = await Promise.all(
    authorList.map(async (author) => {
      const authorResults = await getFileBySlug<AuthorFrontMatter>('authors', [author])
      return authorResults.frontMatter
    })
  )

  const { mdxSource, toc, frontMatter } = post

  if (!('draft' in frontMatter && frontMatter.draft !== true)) {
    notFound()
  }

  return (
    <>
      <JsonLd
        data={blogStructuredData({
          ...frontMatter,
          url: `${siteMetadata.siteUrl}/blog/${slugString}`,
          authorDetails,
        })}
      />
      <MDXLayoutRenderer
        layout={frontMatter.layout || DEFAULT_LAYOUT}
        toc={toc}
        mdxSource={mdxSource}
        frontMatter={frontMatter}
        authorDetails={authorDetails}
        prev={prev}
        next={next}
      />
    </>
  )
}
