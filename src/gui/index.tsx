import * as React from 'react'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import * as ReactDOM from 'react-dom/client'

import { useAsync } from 'react-use'
import classnames from 'classnames'

import { ChannelClient, ChannelErrors, PostMessageTarget } from '../shared/channelRpc'

import type { HandlerType, Note } from '../index'

import './tailwind.css'
import './variables.css'
import searchStyles from './SearchFiles.module.css'
import { keywords } from './searchProcessing'
import { parseNote } from './noteParsings'
import { NoteSearchItemData } from './NoteSearchListData'
import ResultsList from './ResultsList'

const target: PostMessageTarget = {
  postMessage: async (message: any) => {
    webviewApi.postMessage(message)
  },
  onMessage(listener) {
    webviewApi.onMessage((originalMessage) => {
      listener({ source: target, data: originalMessage.message })
    })
  },
}

function parseColor(input: string) {
  // const div = document.createElement('div')
  // div.style.color = input
  // const actualColor = getComputedStyle(div).color=
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
    let notes: Note[] = []
    if (searchText) {
      notes = await client.stub.search({ searchText: searchText, titlesOnly })

      noteListData = notes.map((note) => parseNote(note, parsedKeywords, titlesOnly)).flat()
    }

    return { notes, noteListData }
  }, [searchText, titlesOnly])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setSearchText(value)
  }

  const handleTitlesOnlyChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target
    setTitlesOnly(checked)
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  useLayoutEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    // Horribly hacky attempt to figure out what the current theme is
    // This will not scale, but I can't find an immediate way to query Joplin's theme settings

    const computedStyle = window.getComputedStyle(document.documentElement)

    const backgroundColor = computedStyle.getPropertyValue('background-color')

    const parsedColor = parseColor(backgroundColor)

    let themeColor = 'theme-dark'
    if (parsedColor[0] === '0' && parsedColor[1] === '0' && parsedColor[2] === '0') {
      themeColor = 'theme-light'
    }

    document.documentElement.classList.add(themeColor)
  }, [])

  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  let rendered: React.ReactNode = null

  if (!searchText) {
    rendered = 'Enter a search term'
  } else if (loading) {
    rendered = 'Loading...'
  } else if (searchResults.noteListData.length === 0) {
    rendered = 'No results found'
  } else {
    rendered = (
      <>
        <h3 className="mb-2  font-bold">Results</h3>
        <div className="mb-1">
          {searchResults.noteListData.length} results in {searchResults.notes.length} notes
        </div>
        <div className="grow">
          <ResultsList
            query={searchText}
            results={searchResults.noteListData}
            titlesOnly={titlesOnly}
            status="resolved"
            openNote={async (id, line?: number) => {
              await client.stub.openNote(id, line)
            }}
          />
        </div>
      </>
    )
  }

  return (
    <div className={searchStyles.SearchFiles}>
      <h1 className="mb-2 text-lg font-bold">Joplin VS Code-style Search Plugin</h1>
      <div className="border rounded-sm border-gray-200 m-1 p-1">
        <div className={classnames(searchStyles.InputWrapper, 'mb-2')}>
          <input
            type="text"
            className={classnames(searchStyles.Input, 'px-1')}
            onChange={handleChange}
            value={searchText}
            placeholder="Enter text to search for"
            ref={inputRef}
          />
        </div>
        <div className="mb-1 p-2">
          <label>
            <input type="checkbox" checked={titlesOnly} onChange={handleTitlesOnlyChanged} className="mr-1"></input>
            Search in titles only{' '}
          </label>
        </div>
      </div>

      {rendered}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(<App />)
