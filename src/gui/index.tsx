import * as React from 'react'
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import * as ReactDOM from 'react-dom/client'

import { useAsync } from 'react-use'
import classnames from 'classnames'
import orderBy from 'lodash/orderBy'

import { ChannelClient, ChannelErrors, PostMessageTarget } from '../shared/channelRpc'

import type { Folder, HandlerType, Note } from '../index'

import './tailwind.css'
import './variables.css'
import searchStyles from './SearchFiles.module.css'
import { keywords } from './searchProcessing'
import { ParsedNote, parseNote } from './noteParsings'
import { isFragmentItem, NoteItemData, NoteSearchItemData, NoteSearchListData } from './NoteSearchListData'
import ResultsList from './ResultsList'
import { FilterButton } from './FilterButton'

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

const NO_RESULTS: ParsedNote[] = []

enum SortType {
  Relevance = 'Relevance',
  Updated = 'Updated',
  Matches = 'Matches',
  NoteName = 'Note Name',
  FolderName = 'Folder Name',
}

enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

function App() {
  const [searchText, setSearchText] = useState('')
  const [titlesOnly, setTitlesOnly] = useState(false)
  const [sortType, setSortType] = useState(SortType.Relevance)
  const [sortDirection, setSortDirection] = useState(SortDirection.Descending)

  const {
    value: searchResults,
    loading,
    error,
  } = useAsync(async () => {
    const parsedKeywords = keywords(searchText)
    let noteListData: NoteSearchItemData[] = []
    let notes: Note[] = []
    let folders: Folder[] = []
    let parsedNotes: ParsedNote[] = []
    if (searchText) {
      const searchResult = await client.stub.search({ searchText: searchText, titlesOnly })
      notes = searchResult.notes
      folders = searchResult.folders

      parsedNotes = notes.map((note) => parseNote(note, parsedKeywords, folders, titlesOnly)).filter(Boolean)
    }

    return { notes, noteListData, parsedNotes, folders }
  }, [searchText, titlesOnly])

  const parsedNoteResults = searchResults?.parsedNotes ?? NO_RESULTS

  const [listData, results, sortedResults] = useMemo(() => {
    let sortedResults = parsedNoteResults
    const direction = sortDirection === SortDirection.Ascending ? 'asc' : 'desc'
    const sortFields: Record<SortType, keyof NoteItemData> = {
      [SortType.FolderName]: 'folderTitle',
      [SortType.NoteName]: 'title',
      [SortType.Matches]: 'matchCount',
      [SortType.Updated]: 'updated_time',
      // ignored
      [SortType.Relevance]: 'id',
    }

    if (sortType !== SortType.Relevance) {
      const sortField = sortFields[sortType]
      sortedResults = orderBy(parsedNoteResults, (r) => r.noteItem[sortField], [direction])
    }

    const finalSortedResults = sortedResults.map((parsedNote) => [parsedNote.noteItem, ...parsedNote.fragmentItems])
    const flattenedResults: NoteSearchItemData[] = finalSortedResults.flat()

    const noteListData = new NoteSearchListData(flattenedResults)
    return [noteListData, flattenedResults, sortedResults] as const
  }, [parsedNoteResults, sortType, sortDirection])

  useEffect(() => {
    listData.resultsUpdated()
  }, [listData, results, results.length])

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
  } else if (searchResults.parsedNotes.length === 0) {
    rendered = 'No results found'
  } else {
    const totalMatches = results.filter((r) => isFragmentItem(r)).length
    // https://flowbite.com/docs/forms/select/
    const selectClassname =
      'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 min-w-28'

    rendered = (
      <>
        <div className="flex justify-between">
          <h3 className="mb-2 text-lg font-bold">Results</h3>
          <div className="flex">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className={selectClassname}
            >
              <option value={SortType.Relevance}>Relevance</option>
              <option value={SortType.Matches}>Matches</option>
              <option value={SortType.NoteName}>Note Name</option>
              <option value={SortType.FolderName}>Folder Name</option>
              <option value={SortType.Updated}>Updated</option>
            </select>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as SortDirection)}
              disabled={sortType === SortType.Relevance}
              className={selectClassname}
            >
              <option value={SortDirection.Ascending}>Ascending</option>
              <option value={SortDirection.Descending}>Descending</option>
            </select>
            <FilterButton
              active={false}
              toggle={() => listData.setAllCollapsed()}
              icon="collapse"
              tooltip="Collapse All"
            />
            <FilterButton active={false} toggle={() => listData.resultsUpdated()} icon="expand" tooltip="Expand All" />
          </div>
        </div>

        <div className="mb-1">
          {totalMatches} matches in {searchResults.notes.length} notes
        </div>
        <div className="grow">
          <ResultsList
            query={searchText}
            results={results}
            folders={searchResults.folders}
            listData={listData}
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

  const anyCollapsed = listData.getAnyCollapsed()
  const isSuccess = !!searchText && !loading

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
