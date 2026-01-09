'use client'

import {Card, Flex, Text, Grid, Box} from '@sanity/ui'
import React from 'react'

interface SplitPreviewProps {
  document: {
    displayed: {
      originalDoc?: {
        asset?: {
          _ref: string
        }
      },
      aiContent?: any[]
    }
  }
}

export function SplitPreview({document}: SplitPreviewProps) {
  const {displayed} = document
  const pdfUrl = displayed.originalDoc?.asset?._ref 
    ? `https://cdn.sanity.io/files/51zgtopc/production/${displayed.originalDoc.asset._ref.replace('file-', '').replace('-pdf', '.pdf')}` 
    : null

  if (!pdfUrl) {
    return (
      <Card padding={4} tone="caution">
        <Text>No PDF uploaded for this item yet.</Text>
      </Card>
    )
  }

  // Helper to render portable text blocks simply for preview
  const renderContent = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return <Text>No AI content generated yet.</Text>
    return blocks.map((block: any) => (
      <Box paddingBottom={3} key={block._key}>
        <Text>{block.children?.map((child: any) => child.text).join('')}</Text>
      </Box>
    ))
  }

  return (
    <Grid columns={[1, 1, 2]} style={{height: '100%'}}>
      <Box style={{height: '100%', borderRight: '1px solid #ddd'}}>
        <iframe 
          src={pdfUrl} 
          style={{width: '100%', height: '100%', border: 'none'}} 
          title="Original PDF" 
        />
      </Box>
      <Box padding={4} style={{overflowY: 'auto', maxHeight: '100%'}}>
        <Text size={4} weight="bold" style={{marginBottom: '20px'}}>AI Generated Draft</Text>
        {renderContent(displayed.aiContent || [])}
      </Box>
    </Grid>
  )
}
