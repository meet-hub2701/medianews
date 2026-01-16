'use client'

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `/app/studio/[[...index]]/page.tsx` route
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {structure} from './sanity/structure'
import schemaNewsItem from './sanity/schema_newsItem'

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import {apiVersion, dataset, projectId} from './sanity/env'

import {GenerateAction} from './sanity/GenerateAction'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  
  document: {
    actions: (prev, context) => {
      return context.schemaType === 'newsItem' 
        ? [...prev, GenerateAction] 
        : prev
      }
  },

  // Add and edit the content schema in the './sanity/schema' folder
  schema: {
    types: [schemaNewsItem],
  },
  plugins: [
    structureTool({structure}),
    // Vision is a tool that lets you query your content with GROQ in the studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({defaultApiVersion: apiVersion}),
  ],
})
