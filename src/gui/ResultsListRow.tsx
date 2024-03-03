import { CSSProperties, useContext, useMemo } from 'react'
// import { useImperativeIntervalCacheValues } from "suspense";

import Expandable from './Expandable'
import Icon from './Icon'
import {
  NoteSearchListData,
  Item,
  NoteSearchResult,
  isNoteItem,
  isFragmentItem,
  NoteSearchItemData,
  NoteItemData,
  FragmentItemData,
} from './NoteSearchListData'
import HighlightMatch from './HighlightMatch'
import { GenericListItemData } from './GenericList'
// import { FocusContext } from "replay-next/src/contexts/FocusContext";
// import { SourcesContext } from "replay-next/src/contexts/SourcesContext";
// import {
//   SourceSearchResultLocation,
//   SourceSearchResultMatch,
//   isSourceSearchResultLocation,
//   isSourceSearchResultMatch,
// } from "replay-next/src/suspense/SearchCache";
// import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
// import { Source } from "replay-next/src/suspense/SourcesCache";
// import { getSourceFileName } from "replay-next/src/utils/source";
// import { getRelativePathWithoutFile } from "replay-next/src/utils/url";
// import { ReplayClientContext } from "shared/client/ReplayClientContext";
// import { toPointRange } from "shared/utils/time";

import styles from './ResultsListRow.module.css'

export const ITEM_SIZE = 20

export type ItemData = {
  listData: NoteSearchListData
  query: string
  openNote: (noteId: string) => void
}

export default function ResultsListItem({
  data,
  index,
  style,
}: {
  data: GenericListItemData<Item, ItemData>
  index: number
  style: CSSProperties
}) {
  const { itemData, listData: genericListData } = data

  const listData = genericListData as NoteSearchListData
  const { openNote } = itemData
  const { isCollapsed, result } = listData.getItemAtIndex(index)

  console.log('Note item: ', index, result)

  if (isNoteItem(result)) {
    return <LocationRow index={index} isCollapsed={isCollapsed} listData={listData} result={result} style={style} />
  } else if (isFragmentItem(result)) {
    return <MatchRow query={itemData.query} result={result} style={style} openNote={openNote} />
  } else {
    throw Error('Unexpected result type')
  }
}

function LocationRow({
  index,
  isCollapsed,
  listData,
  result,
  style,
}: {
  index: number
  isCollapsed: boolean
  listData: NoteSearchListData
  result: NoteItemData
  style: CSSProperties
}) {
  const { id, title, matchCount } = result

  console.log('LocationRow: ', index, id, title, matchCount)

  // const [fileName, path] = useMemo(() => {
  //   const source = sources.find(({ sourceId }) => sourceId === location.sourceId)
  //   if (source == null) {
  //     return ['(unknown)', '']
  //   }

  //   const fileName = getSourceFileName(source)
  //   const path = source.url ? getRelativePathWithoutFile(source.url) : ''

  //   return [fileName, path]
  // }, [location, sources])

  // const locationString = `${fileName} ${path ? `(${path})` : ''}`

  return (
    <div style={style}>
      <Expandable
        children={null}
        defaultOpen={!isCollapsed}
        header={
          <>
            <Icon className={styles.LocationIcon} type="file" />
            <div className={styles.Location} title={title}>
              {title}
            </div>
            <div className={styles.Count}>({matchCount === 1 ? '1 match' : `${matchCount} matches`})</div>
          </>
        }
        headerClassName={styles.LocationRow}
        key={id /* Re-apply defaultCollapsed if row content changes */}
        onChange={(collapsed) => listData.toggleCollapsed(index, !collapsed)}
      />
    </div>
  )
}

interface MatchRowProps {
  query: string
  result: FragmentItemData
  style: CSSProperties
  openNote: (noteId: string) => void
}

function MatchRow({ query, result, style, openNote }: MatchRowProps) {
  // const { context, location } = result.match

  console.log('MatchRow: ', result.noteId, result.fragment)

  return (
    <div
      className={styles.MatchRow}
      data-test-name="SearchFiles-ResultRow"
      data-test-type="Match"
      onClick={() => {
        // const lineIndex = location.line - 1
        openNote(result.noteId)
      }}
      style={style}
    >
      <span className={styles.GroupLine}>&nbsp;&nbsp;</span>
      <HighlightMatch caseSensitive={false} needle={query} text={result.fragment} />
    </div>
  )
}
