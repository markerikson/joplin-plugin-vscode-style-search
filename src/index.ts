import joplin from 'api'
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types'
import type * as FSType from 'fs-extra'
import { ChannelServer, PostMessageTarget } from './shared/channelRpc'
import { RpcMethods } from './shared/rpcTypes'

export interface SearchQueryOptions {
  searchText: string
  titlesOnly?: boolean
}

const handler = {
  search: searchNotes,
  openNote: async (noteId: string, line?: number) => {
    await joplin.commands.execute('openNote', noteId)

    // TODO Figure out how to scroll to a specific line
    // const delay_scroll = 1

    // if (line > 0) {
    //   await new Promise((res) => setTimeout(res, delay_scroll * 1000))
    //   await joplin.commands.execute('editor.execCommand', {
    //     name: 'sidebar_cm_scrollToLine',
    //     args: [line - 1],
    //   })
    // }
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

export interface Folder {
  id: string
  parent_id: string
  title: string
}

interface SearchResponse<T> {
  has_more: boolean
  items: T[]
}

interface NotesSearchResults {
  notes: Note[]
  folders: Folder[]
}

async function searchNotes(queryOptions: SearchQueryOptions): Promise<NotesSearchResults> {
  let hasMore = false
  let allNotes: Note[] = []
  let page = 1

  const { searchText, titlesOnly } = queryOptions

  const query = titlesOnly ? `title:${searchText}` : searchText

  const fields = ['id', 'title', 'body', 'parent_id', 'is_todo', 'todo_completed', 'todo_due', 'order', 'created_time']

  while (true) {
    const res: SearchResponse<Note> = await joplin.data.get(['search'], {
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

  const allFoldersResult: SearchResponse<Folder> = await joplin.data.get(['folders'], {})

  return {
    notes: allNotes,
    folders: allFoldersResult.items,
  }
}

async function setUpSearchPanel(panel: string) {
  const pluginDir = await joplin.plugins.installationDir()

  const fs: typeof FSType = joplin.require('fs-extra')

  const files = await fs.promises.readdir(pluginDir + '/gui/')

  const cssFiles = files.filter((file) => file.endsWith('.css')).map((file) => 'gui/' + file)

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
}

joplin.plugins.register({
  onStart: async function () {
    // Create the panel object
    const panel = await joplin.views.panels.create('panel_1')

    await joplin.views.panels.hide(panel)

    setUpSearchPanel(panel)

    joplin.commands.register({
      name: 'isquaredsoftware.vscode-search.toggle_panel',
      label: 'Toggle VS Code-style search panel',
      execute: async () => {
        if (await joplin.views.panels.visible(panel)) {
          await joplin.views.panels.hide(panel)
        } else {
          await joplin.views.panels.show(panel)
        }
      },
    })

    joplin.views.menuItems.create(
      'isquaredsoftware.vscode-search.toggle_panel.menuitem',
      'isquaredsoftware.vscode-search.toggle_panel',
      MenuItemLocation.View,
      { accelerator: 'CmdOrCtrl+Shift+F' },
    )

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
