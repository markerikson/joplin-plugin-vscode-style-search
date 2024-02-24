import * as React from 'react'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import * as ReactDOM from 'react-dom/client'
import { marked } from 'marked'
import { convert as htmlToText } from 'html-to-text'

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

function parseColor(input: string) {
  // const div = document.createElement('div')
  // div.style.color = input
  // const actualColor = getComputedStyle(div).color
  // console.log('Actual color: ', actualColor)
  const m = input.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+),?\s*(\d+)?\)$/i)
  if (m) return [m[1], m[2], m[3]]
  else throw new Error('Colour ' + input + ' could not be parsed.')
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

  const initializedRef = useRef(false)

  useLayoutEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    const computedStyle = window.getComputedStyle(document.documentElement)

    console.log('Computed style: ', computedStyle)

    const backgroundColor = computedStyle.getPropertyValue('background-color')

    console.log('Background color: ', backgroundColor)
    const parsedColor = parseColor(backgroundColor)

    console.log('Parsed color: ', parsedColor)
    let themeColor = 'theme-dark'
    if (parsedColor[0] === '0' && parsedColor[1] === '0' && parsedColor[2] === '0') {
      themeColor = 'theme-light'
    }

    document.documentElement.classList.add(themeColor)
  }, [])

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
    const htmlContent = marked.parse(note.body) as string
    const strippedContent = htmlToText(htmlContent)
    console.log('Stripped content: ', strippedContent)
    return (
      <li key={note.id}>
        {note.title}
        <div>Content: {strippedContent.slice(0, 100)}</div>
      </li>
    )
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
