'use client'

import React, { useMemo } from 'react'
import { getMDXComponent } from 'mdx-bundler/client'
import Image from './Image'
import CustomLink from './Link'
import TOCInline from './TOCInline'
import Pre from './Pre'
import { BlogNewsletterForm } from './NewsletterForm'
import AuthorLayout from '@/layouts/AuthorLayout'
import PostLayout from '@/layouts/PostLayout'
import PostSimple from '@/layouts/PostSimple'

const layouts = {
  AuthorLayout,
  PostLayout,
  PostSimple,
}

const Wrapper = ({ layout, ...rest }: { layout: string; [key: string]: unknown }) => {
  const Layout = layouts[layout] ?? PostLayout
  return <Layout {...rest} />
}

export const MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  wrapper: Wrapper,
  BlogNewsletterForm,
}

interface Props {
  layout: string
  mdxSource: string
  [key: string]: unknown
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }: Props) => {
  const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource])

  // eslint-disable-next-line react-hooks/static-components
  return <MDXLayout layout={layout} components={MDXComponents} {...rest} />
}
