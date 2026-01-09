import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'newsItem',
  title: 'News Item',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Review Status',
      type: 'string',
      options: {
        list: [
          { title: 'Needs Review', value: 'needs_review' },
          { title: 'Published', value: 'published' },
          { title: 'Rejected', value: 'rejected' },
        ],
        layout: 'radio',
      },
      initialValue: 'needs_review',
    }),
    defineField({
      name: 'uploadedBy',
      title: 'Uploaded By (Editor)',
      type: 'string',
      description: 'Name of the editor who uploaded the file.',
    }),
    defineField({
      name: 'assignedReviewer',
      title: 'Assigned To (Reviewer)',
      type: 'string',
      options: {
        list: [
          {title: 'Senior Editor', value: 'senior_editor'},
          {title: 'Chief Reviewer', value: 'chief_reviewer'},
        ],
      },
    }),
    defineField({
      name: 'originalDoc',
      title: 'Original Press Release (PDF)',
      type: 'file',
      options: {
        accept: '.pdf,.doc,.docx',
      },
    }),
    defineField({
      name: 'aiContent',
      title: 'AI Generated Content',
      type: 'array', 
      of: [{type: 'block'}], 
      description: 'The AI-rewritten version of the press release.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      hidden: ({document}) => document?.status !== 'published',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
    },
    prepare({title, status}) {
      const emojis = {
        needs_review: '🔴',
        published: '🟢',
        rejected: '⚫',
      }
      return {
        title: title,
        subtitle: `Status: ${status}`,
        media: () => emojis[status as keyof typeof emojis] || '❓',
      }
    },
  },
})
