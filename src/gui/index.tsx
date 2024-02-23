import * as React from 'react'
import { useState } from 'react'
import * as ReactDOM from 'react-dom/client'

import { ChannelClient, ChannelErrors, PostMessageTarget } from '../shared/channelRpc'

import type { HandlerType } from '../index'

const target: PostMessageTarget = {
  postMessage: async (message: any) => {
    console.log('Client postMessage: ', message)
    webviewApi.postMessage(message)
  },
  onMessage(listener) {
    console.log('Client onMessage listener: ', listener)
    webviewApi.onMessage((originalMessage) => {
      console.log('Client onMessage: ', originalMessage)
      listener({ source: target, data: originalMessage.message })
    })
  },
}

// Create a ChannelClient instance
const client = new ChannelClient<HandlerType>({
  target,
  channelId: 'channel-1',
  timeout: 10000,
})

function App() {
  const [res, setRes] = useState(0)
  const handleClick = async () => {
    const res = await client.stub.add(1, 2)
    console.log('Result: ', res)
    setRes(res)
  }
  return (
    <div>
      <div style={{ color: 'blue', fontSize: 60 }}>Hello World from React + RSPack!!</div>
      <div>
        <button onClick={handleClick}>Click Me</button>
      </div>
      <div>Result: {res}</div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(<App />)
