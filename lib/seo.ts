import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { AuthorFrontMatter } from 'types/AuthorFrontMatter'
import { PostFrontMatter } from 'types/PostFrontMatter'

interface CommonSEOProps {
  title: string
  description: string
}

const ogImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner
const twImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner

export function pageSEO({ title, description }: CommonSEOProps): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteMetadata.siteUrl,
      siteName: siteMetadata.title,
      images: [ogImageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: siteMetadata.twitter,
      title,
      description,
      images: [twImageUrl],
    },
  }
}

export function tagSEO({ title, description }: CommonSEOProps, tag: string): Metadata {
  return {
    ...pageSEO({ title, description }),
    alternates: {
      types: {
        'application/rss+xml': `${siteMetadata.siteUrl}/tags/${tag}/feed.xml`,
      },
    },
  }
}

interface BlogSEOProps extends PostFrontMatter {
  authorDetails?: AuthorFrontMatter[]
  url: string
}

export function blogSEO({
  authorDetails,
  title,
  summary,
  date,
  lastmod,
  url,
  images = [],
}: BlogSEOProps): Metadata {
  const publishedAt = new Date(date).toISOString()
  const modifiedAt = new Date(lastmod || date).toISOString()
  const imagesArr =
    images.length === 0
      ? [siteMetadata.socialBanner]
      : typeof images === 'string'
        ? [images]
        : images

  const authors = authorDetails?.map((author) => author.name) ?? [siteMetadata.author]

  return {
    title,
    description: summary,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: summary,
      url,
      siteName: siteMetadata.title,
      images: imagesArr,
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      authors,
    },
    twitter: {
      card: 'summary_large_image',
      site: siteMetadata.twitter,
      title,
      description: summary,
      images: [`${siteMetadata.siteUrl}${imagesArr[0]}`],
    },
  }
}

export function blogStructuredData({
  authorDetails,
  title,
  summary,
  date,
  lastmod,
  url,
  images = [],
}: BlogSEOProps) {
  const publishedAt = new Date(date).toISOString()
  const modifiedAt = new Date(lastmod || date).toISOString()
  const imagesArr =
    images.length === 0
      ? [siteMetadata.socialBanner]
      : typeof images === 'string'
        ? [images]
        : images

  const featuredImages = imagesArr.map((img) => ({
    '@type': 'ImageObject',
    url: `${siteMetadata.siteUrl}${img}`,
  }))

  const authorList = authorDetails
    ? authorDetails.map((author) => ({
        '@type': 'Person',
        name: author.name,
      }))
    : {
        '@type': 'Person',
        name: siteMetadata.author,
      }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: title,
    image: featuredImages,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: authorList,
    publisher: {
      '@type': 'Organization',
      name: siteMetadata.author,
      logo: {
        '@type': 'ImageObject',
        url: `${siteMetadata.siteUrl}${siteMetadata.siteLogo}`,
      },
    },
    description: summary,
  }
}
