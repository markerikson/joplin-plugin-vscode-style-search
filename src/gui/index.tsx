import * as React from 'react'
import { useState, useEffect } from 'react'
import * as ReactDOM from 'react-dom/client'

import { ChannelClient, ChannelErrors, PostMessageTarget } from '../shared/channelRpc'

import type { HandlerType, Note } from '../index'

import './tailwind.css'
import './variables.css'
import searchStyles from './SearchFiles.module.css'

console.log('Search styles: ', searchStyles)

const target: PostMessageTarget = {
  postMessage: async (message: any) => {
    // console.log('Client postMessage: ', message)
    webviewApi.postMessage(message)
  },
  onMessage(listener) {
    // console.log('Client onMessage listener: ', listener)
    webviewApi.onMessage((originalMessage) => {
      // console.log('Client onMessage: ', originalMessage)
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
  const [searchText, setSearchText] = useState('')
  const [titlesOnly, setTitlesOnly] = useState(false)
  const [searchResults, setSearchResults] = useState<Note[]>([])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setSearchText(value)
  }

  const handleTitlesOnlyChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target
    setTitlesOnly(checked)
  }

  useEffect(() => {
    const fetchNotes = async () => {
      let notes: Note[] = []
      console.log('Search value: ', searchText)
      if (searchText) {
        notes = await client.stub.search({ searchText: searchText, titlesOnly })
        console.log('Search notes: ', notes)
      }

      setSearchResults(notes)
    }
    fetchNotes()
  }, [searchText, titlesOnly])

  const renderedNotes = searchResults.map((note) => {
    return <li key={note.id}>{note.title}</li>
  })

  return (
    <div className={searchStyles.SearchFiles}>
      <div style={{ fontWeight: 700, fontSize: 32 }}>Hello World from React + RSPack!!</div>
      <div className={searchStyles.InputWrapper}>
        <input type="text" className={searchStyles.Input} onChange={handleChange} value={searchText} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={titlesOnly} onChange={handleTitlesOnlyChanged}></input>Titles Only{' '}
        </label>
      </div>
      <div>
        Results:
        <ul>{renderedNotes}</ul>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(<App />)
