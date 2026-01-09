import {StructureBuilder} from 'sanity/structure'
import {SplitPreview} from './SplitPreview'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Newsroom Content')
    .items([
      // The "Review Queue" - Only items needing review
      S.listItem()
        .title('Review Queue (Needs Action)')
        .icon(() => '🔴')
        .child(
          S.documentList()
            .title('Inbox')
            .filter('(_type == "newsItem" && status == "needs_review")')
            .child((documentId) =>
                S.document()
                  .documentId(documentId)
                  .schemaType('newsItem')
                  .views([
                    S.view.form().title('Editor'),
                    S.view.component(SplitPreview).title('Split View (PDF vs Text)'),
                  ])
            )
        ),
        
      S.divider(),
      
      // Standard folders
      S.documentTypeListItem('newsItem').title('All News Items'),
    ])
