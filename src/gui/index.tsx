import * as React from 'react'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import * as ReactDOM from 'react-dom/client'

import { useAsync } from 'react-use'

import { ChannelClient, ChannelErrors, PostMessageTarget } from '../shared/channelRpc'

import type { HandlerType, Note } from '../index'

import './tailwind.css'
import './variables.css'
import searchStyles from './SearchFiles.module.css'
import { keywords } from './searchProcessing'
import { parseNote } from './noteParsings'
import { NoteSearchItemData } from './NoteSearchListData'
import ResultsList from './ResultsList'

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

  const parsedKeywords = keywords(searchText)

  const { value: searchResults, loading } = useAsync(async () => {
    let noteListData: NoteSearchItemData[] = []
    console.log('Search value: ', searchText)
    if (searchText) {
      const notes = await client.stub.search({ searchText: searchText, titlesOnly })
      console.log('Search notes: ', notes)

      noteListData = notes.map((note) => parseNote(note, parsedKeywords)).flat()
      console.log('Note list data: ', noteListData)
    }

    return noteListData
  }, [searchText, titlesOnly])

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

  // useEffect(() => {
  //   const fetchNotes = async () => {
  //     let notes: Note[] = []
  //     console.log('Search value: ', searchText)
  //     if (searchText) {
  //       notes = await client.stub.search({ searchText: searchText, titlesOnly })
  //       console.log('Search notes: ', notes)
  //     }

  //     setSearchResults(notes)
  //   }
  //   fetchNotes()
  // }, [searchText, titlesOnly])

  let rendered: React.ReactNode = null

  if (!searchText) {
    rendered = 'Enter a search term'
  } else if (loading) {
    rendered = 'Loading...'
  } else if (searchResults.length === 0) {
    rendered = 'No results found'
  } else {
    // const renderedNotes = searchResults.map((note) => {
    //   return (
    //     <li key={note.id}>
    //       {note.title}
    //       <div>
    //         <b>Content</b>: {strippedContent.slice(0, 100)}
    //       </div>
    //       <div>
    //         <b>Fragments:</b> {fragments}
    //       </div>
    //     </li>
    //   )
    // })

    rendered = (
      <ResultsList
        query={searchText}
        results={searchResults}
        status="resolved"
        openNote={(id) => {
          console.log('Opening note: ', id)
        }}
      />
    )
  }

  return (
    <div className={searchStyles.SearchFiles}>
      <h1 className="mb-2 text-lg font-bold">Joplin VS Code-style Search Plugin</h1>
      <div className={searchStyles.InputWrapper}>
        <input type="text" className={searchStyles.Input} onChange={handleChange} value={searchText} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={titlesOnly} onChange={handleTitlesOnlyChanged}></input>Titles Only{' '}
        </label>
      </div>
      <div style={{ flexGrow: 2 }}>
        Results:
        {rendered}
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(<App />)
