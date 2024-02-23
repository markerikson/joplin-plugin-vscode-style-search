import joplin from 'api'
import { ChannelServer, PostMessageTarget } from './shared/channelRpc'
import { RpcMethods } from './shared/rpcTypes'

const handler = {
  add: (a: number, b: number): number => a + b,
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

joplin.plugins.register({
  onStart: async function () {
    // eslint-disable-next-line no-console
    console.info('Hello world. Test plugin started! 42')

    // Create the panel object
    const panel = await joplin.views.panels.create('panel_1')

    // Set some initial content while the TOC is being created
    await joplin.views.panels.setHtml(
      panel,
      `
			<div class="container">Loading...</div>
			<div id="root"></div>
		`,
    )

    await joplin.views.panels.addScript(panel, 'gui/app.css')
    await joplin.views.panels.addScript(panel, 'gui/index.js')

    const target: PostMessageTarget = {
      postMessage: async (message: any) => {
        console.log('Server postMessage: ', message)
        joplin.views.panels.postMessage(panel, message)
      },
      onMessage(listener) {
        console.log('Server onMessage listener: ', listener)
        joplin.views.panels.onMessage(panel, (originalMessage) => {
          console.log('Server onMessage: ', originalMessage)
          listener({ source: target, data: originalMessage })
        })
      },
    }

    const server = createRpcServer(target)
    console.log('Starting server')
    server.start()
  },
})
