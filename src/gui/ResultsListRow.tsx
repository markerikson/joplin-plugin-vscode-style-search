import React, { CSSProperties, useContext, useMemo } from 'react'

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
  titlesOnly: boolean
  openNote: (noteId: string, line?: number) => void
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
  const { openNote, titlesOnly } = itemData
  const { isCollapsed, result } = listData.getItemAtIndex(index)

  if (isNoteItem(result)) {
    return (
      <LocationRow
        index={index}
        isCollapsed={isCollapsed}
        listData={listData}
        titlesOnly={titlesOnly}
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
  titlesOnly,
  result,
  style,
  openNote,
}: {
  index: number
  isCollapsed: boolean
  listData: NoteSearchListData
  titlesOnly: boolean
  result: NoteItemData
  style: CSSProperties
  openNote: (noteId: string, line?: number) => void
}) {
  const { id, title, matchCount } = result

  const handleOpenNoteClicked = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openNote(result.id)
  }

  const noteHeaderContent = (
    <>
      <Icon className={styles.LocationIcon} type="file" />
      <div className={styles.Location} title={title}>
        {title}
      </div>
      {titlesOnly ? null : (
        <div className={styles.Count}>({matchCount === 1 ? '1 match' : `${matchCount} matches`})</div>
      )}

      <Icon className={styles.LocationIcon} type="open" title="Open Note" onClick={handleOpenNoteClicked} />
    </>
  )

  let rowContent = (
    <span className="inline-block">
      <span className={styles.LocationRow} onClick={handleOpenNoteClicked}>
        {noteHeaderContent}
      </span>
    </span>
  )

  if (!titlesOnly) {
    rowContent = (
      <Expandable
        children={null}
        defaultOpen={titlesOnly ? false : !isCollapsed}
        header={noteHeaderContent}
        headerClassName={styles.LocationRow}
        key={id /* Re-apply defaultCollapsed if row content changes */}
        onChange={(collapsed) => listData.setCollapsed(index, !collapsed)}
      />
    )
  }

  return <div style={style}>{rowContent}</div>
}

interface MatchRowProps {
  query: string
  result: FragmentItemData
  style: CSSProperties
  openNote: (noteId: string, line?: number) => void
}

function MatchRow({ query, result, style, openNote }: MatchRowProps) {
  return (
    <div
      className={styles.MatchRow}
      onClick={() => {
        openNote(result.noteId, result.line)
      }}
      style={style}
    >
      <span className={styles.GroupLine}>&nbsp;&nbsp;</span>
      <HighlightMatch caseSensitive={false} needle={query} text={result.fragment} />
    </div>
  )
}
