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
import { keywords } from './searchProcessing'

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

export function nextWhitespaceIndex(s: string, begin: number) {
  // returns index of the next whitespace character
  const i = s.slice(begin).search(/\s/)
  return i < 0 ? s.length : begin + i
}

const mergeOverlappingIntervals = function (intervals: any[], limit: number) {
  intervals.sort((a, b) => a[0] - b[0])

  const stack: any[] = []
  if (intervals.length) {
    stack.push(intervals[0])
    for (let i = 1; i < intervals.length && stack.length < limit; i++) {
      const top = stack[stack.length - 1]
      if (top[1] < intervals[i][0]) {
        stack.push(intervals[i])
      } else if (top[1] < intervals[i][1]) {
        top[1] = intervals[i][1]
        stack.pop()
        stack.push(top)
      }
    }
  }
  return stack
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

  const parsedKeywords = keywords(searchText)

  console.log('Keywords: ', parsedKeywords)

  const renderedNotes = searchResults.map((note) => {
    const htmlContent = marked.parse(note.body) as string
    const strippedContent = htmlToText(htmlContent)

    const indices: number[][] = []

    let fragments = ''

    for (let keyword of parsedKeywords) {
      let valueRegex: string | undefined = undefined
      if (typeof keyword === 'string') {
        valueRegex = keyword
      } else if (keyword.type === 'text') {
        valueRegex = keyword.value
      } else if (keyword.valueRegex) {
        valueRegex = keyword.valueRegex
      }

      if (valueRegex) {
        for (const match of strippedContent.matchAll(new RegExp(valueRegex, 'ig'))) {
          // Populate 'indices' with [begin index, end index] of each note fragment
          // Begins at the regex matching index, ends at the next whitespace after seeking 15 characters to the right
          indices.push([match.index, nextWhitespaceIndex(strippedContent, match.index + match[0].length + 15)])
          if (indices.length > 20) break
        }
      } else {
        fragments = 'N/A'
      }
      // if (typeof keyword !== 'string' && 'valueRegex' in keyword) {
      //   const { valueRegex } = keyword

      // } else {
      //   fragments = 'N/A'
      // }
    }

    console.log('Indices: ', note.title, indices)

    const mergedIndices = mergeOverlappingIntervals(indices, 3)
    fragments = mergedIndices.map((f: any) => strippedContent.slice(f[0], f[1])).join(' ... ')
    // Add trailing ellipsis if the final fragment doesn't end where the note is ending
    if (mergedIndices.length && mergedIndices[mergedIndices.length - 1][1] !== strippedContent.length)
      fragments += ' ...'

    return (
      <li key={note.id}>
        {note.title}
        <div>
          <b>Content</b>: {strippedContent.slice(0, 100)}
        </div>
        <div>
          <b>Fragments:</b> {fragments}
        </div>
      </li>
    )
  })

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
      <div>
        Results:
        <ul>{renderedNotes}</ul>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(<App />)
