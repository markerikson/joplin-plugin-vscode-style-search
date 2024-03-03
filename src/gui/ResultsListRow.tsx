import { CSSProperties, useContext, useMemo } from 'react'

import Expandable from './Expandable'
import Icon from './Icon'
import {
  NoteSearchListData,
  Item,
  isNoteItem,
  isFragmentItem,
  NoteItemData,
  FragmentItemData,
} from './NoteSearchListData'
import HighlightMatch from './HighlightMatch'
import { GenericListItemData } from './GenericList'

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

  if (isNoteItem(result)) {
    return (
      <LocationRow
        index={index}
        isCollapsed={isCollapsed}
        listData={listData}
        result={result}
        style={style}
        openNote={openNote}
      />
    )
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
  openNote,
}: {
  index: number
  isCollapsed: boolean
  listData: NoteSearchListData
  result: NoteItemData
  style: CSSProperties
  openNote: (noteId: string) => void
}) {
  const { id, title, matchCount } = result

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

            <Icon
              className={styles.LocationIcon}
              type="open"
              title="Open Note"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openNote(result.id)
              }}
            />
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
  return (
    <div
      className={styles.MatchRow}
      onClick={() => {
        openNote(result.noteId)
      }}
      style={style}
    >
      <span className={styles.GroupLine}>&nbsp;&nbsp;</span>
      <HighlightMatch caseSensitive={false} needle={query} text={result.fragment} />
    </div>
  )
}
