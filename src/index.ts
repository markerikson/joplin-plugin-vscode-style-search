import joplin from 'api'
import type * as FSType from 'fs-extra'
import { ChannelServer, PostMessageTarget } from './shared/channelRpc'
import { RpcMethods } from './shared/rpcTypes'

export interface SearchQueryOptions {
  searchText: string
  titlesOnly?: boolean
}

const handler = {
  search: searchNotes,
  openNote: async (noteId: string) => {
    await joplin.commands.execute('openNote', noteId)
  },
}

export type HandlerType = typeof handler

export const createRpcServer = (target: PostMessageTarget) => {
  // Create a ChannelServer instance
  const server = new ChannelServer({
    target,
    channelId: 'channel-1', // Must match the channelId in the child window
    handler: handler, // Your message handler,
  })

  return server
}

export interface Note {
  id: string
  parent_id: string
  title: string
  body: string
  body_html: string
  created_time: number
  updated_time: number
  source: string
}

interface SearchResponse {
  has_more: boolean
  items: Note[]
}

async function searchNotes(queryOptions: SearchQueryOptions): Promise<Note[]> {
  let hasMore = false
  let allNotes: Note[] = []
  let page = 1

  const { searchText, titlesOnly } = queryOptions

  const query = titlesOnly ? `title:${searchText}` : searchText

  const fields = ['id', 'title', 'body', 'parent_id', 'is_todo', 'todo_completed', 'todo_due', 'order', 'created_time']

  while (true) {
    const res: SearchResponse = await joplin.data.get(['search'], {
      query,
      page,
      fields,
      limit: 100,
    })

    const { items: notes, has_more } = res
    allNotes = allNotes.concat(notes)

    hasMore = has_more
    if (!hasMore) {
      break
    } else {
      page++
    }
  }

  return allNotes
}

joplin.plugins.register({
  onStart: async function () {
    // eslint-disable-next-line no-console
    console.info('Hello world. Test plugin started! 42')

    const pluginDir = await joplin.plugins.installationDir()
    console.log('Plugin directory: ', pluginDir)

    const fs: typeof FSType = joplin.require('fs-extra')

    const files = await fs.promises.readdir(pluginDir + '/gui/')
    console.log('Plugin files: ', files)
    const cssFiles = files.filter((file) => file.endsWith('.css')).map((file) => 'gui/' + file)

    // Create the panel object
    const panel = await joplin.views.panels.create('panel_1')

    // Set some initial content while the TOC is being created
    await joplin.views.panels.setHtml(
      panel,
      `
			<div id="root"></div>
		`,
    )

    for (const file of cssFiles) {
      await joplin.views.panels.addScript(panel, file)
    }
    await joplin.views.panels.addScript(panel, 'gui/index.js')

    const target: PostMessageTarget = {
      postMessage: async (message: any) => {
        joplin.views.panels.postMessage(panel, message)
      },
      onMessage(listener) {
        joplin.views.panels.onMessage(panel, (originalMessage) => {
          listener({ source: target, data: originalMessage })
        })
      },
    }

    const server = createRpcServer(target)
    server.start()
  },
})
