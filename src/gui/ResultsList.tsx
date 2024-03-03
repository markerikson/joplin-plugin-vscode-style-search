import { useContext, useEffect, useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
// import { STATUS_PENDING, STATUS_RESOLVED, useStreamingValue } from "suspense";

import { NoteSearchResult, NoteSearchListData, Item, NoteSearchItemData } from './NoteSearchListData'
// import Icon from "replay-next/components/Icon";
// import { FileSearchListData, Item } from "replay-next/components/search-files/FileSearchListData";
import { STATUS_RESOLVED, STATUS_PENDING } from './GenericListData'
import { GenericList } from './GenericList'
// import { SourceSearchResult, StreamingSearchValue } from "replay-next/src/suspense/SearchCache";
// import { sourcesCache } from "replay-next/src/suspense/SourcesCache";
// import { ReplayClientContext } from "shared/client/ReplayClientContext";

import type { ItemData } from './ResultsListRow'
import ResultsListRow, { ITEM_SIZE } from './ResultsListRow'
import styles from './ResultsList.module.css'

const EMPTY_ARRAY = [] as NoteSearchItemData[]

interface ResultsListProps {
  query: string
  status: 'pending' | 'resolved'
  results: NoteSearchItemData[]
  openNote: (noteId: string) => void
}

export default function ResultsList({ query, status, results, openNote }: ResultsListProps) {
  // const { data, status, value: orderedResults = EMPTY_ARRAY } = useStreamingValue(streaming)

  const isPending = status === STATUS_PENDING

  // const sources = sourcesCache.read(replayClient)

  const listData = useMemo(() => new NoteSearchListData(results), [results])

  // Data streams in to the same array, so we need to let the list know when to recompute the item count.
  useEffect(() => {
    listData.resultsUpdated()
  }, [listData, results, results.length])

  const itemData = useMemo<ItemData>(
    () => ({
      listData,
      query,
      results,
      openNote,
    }),
    [listData, query, results, openNote],
  )

  console.log('List status: ', status, results)

  if (status === STATUS_RESOLVED && results.length === 0) {
    return <div>No results found somehow!</div>
  }

  return (
    <div className={isPending ? styles.ResultsPending : styles.Results}>
      <div className={styles.List}>
        <AutoSizer
          children={({ height, width }) => (
            <GenericList<Item, ItemData>
              className={styles.List}
              height={height}
              itemData={itemData}
              itemRendererComponent={ResultsListRow}
              itemSize={ITEM_SIZE}
              listData={listData}
              width={width}
            />
          )}
        />
      </div>
    </div>
  )
}
