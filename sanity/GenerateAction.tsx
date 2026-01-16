import { DocumentActionProps, useDocumentOperation } from 'sanity'
import { useToast } from '@sanity/ui'
import { useState } from 'react'

export function GenerateAction(props: DocumentActionProps) {
  const { patch, publish } = useDocumentOperation(props.id, props.type)
  const [isGenerating, setIsGenerating] = useState(false)
  const toast = useToast()

  // Only show on 'newsItem' type
  if (props.type !== 'newsItem') {
    return null
  }

  // Check if we have a file uploaded
  const doc = props.draft || props.published
  // @ts-ignore
  const hasFile = doc?.originalDoc?.asset?._ref

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
        // Resolve File URL (Constructing manually or you could use useClient)
        // Note: For now we passed the ID to the API, but the API expects a public URL if from Zapier.
        // However, since we are calling from the browser, we need the File URL.
        // Let's use the Sanity Client to get the URL first.
        
        // Actually, our API takes { _id, fileUrl }.
        // If we are in the Studio, we can just send the _id and let the backend figure it out?
        // NO, the backend `route.ts` expects `fileUrl` to pass to `uploadToGCS`.
        
        // We will construct the CDN URL:
        // projectid.api.sanity.io/...
        // A better way is to fetch the document in the action, but let's try a simpler approach:
        // Send the _id, and modify the route to fetch the file URL from Sanity if not provided?
        // Or resolve it here.
        
        // Let's Resolve it here using the Client
        // We need 'useClient' hook
        // const client = useClient({apiVersion: '2023-05-30'})
        // But hooks rules apply.
        
        // SIMPLIFICATION:
        // We send the ID. The backend handles the rest.
        // Wait, the backend currently requires `fileUrl`. 
        // I will modify the backend to be smarter: "If no fileUrl, look up the document".
        
        // For now, let's just trigger the API with the ID
        
        const response = await fetch('/api/start-process', {
            method: 'POST',
            body: JSON.stringify({
                _id: props.id,
                fileUrl: 'LOOKUP_IN_SANITY', // Signal to backend
                isManual: true
            })
        })
        
        const result = await response.json()
        
        if(response.ok) {
            toast.push({
                status: 'success',
                title: 'AI Draft Generated!',
                description: 'The content has been rewritten.'
            })
        } else {
            throw new Error(result.error || 'Unknown Error')
        }

    } catch(err: any) {
        toast.push({
            status: 'error',
            title: 'Generation Failed',
            description: err.message
        })
    } finally {
        setIsGenerating(false)
    }
  }

  return {
    label: isGenerating ? 'Generating...' : 'Generate AI Draft',
    disabled: !hasFile || isGenerating,
    onHandle: handleGenerate,
    icon: () => '✨',
  }
}
