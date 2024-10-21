import { Note } from 'src'
import { assert } from '../shared/assert'

import { GenericListData } from './GenericListData'

export interface NoteSearchResult {
  id: string
  note: Note
  strippedContent: string
  fragments: string[]
  matchCount: number
}

export type NoteItemData = {
  type: 'note'
  id: string
  note: Note
  title: string
  matchCount: number
}

export type FragmentItemData = {
  type: 'fragment'
  id: string
  noteId: string
  fragment: string
  line: number
}

export type NoteSearchItemData = NoteItemData | FragmentItemData

export type Item = {
  isCollapsed: boolean
  result: NoteSearchItemData
}

export const isNoteItem = (item: NoteSearchItemData): item is NoteItemData => {
  return item.type === 'note'
}

export const isFragmentItem = (item: NoteSearchItemData): item is FragmentItemData => {
  return item.type === 'fragment'
}

export class NoteSearchListData extends GenericListData<Item> {
  private collapsedResultIndexToCountMap: Map<number, number> = new Map()
  private collapsedRowCount: number = 0
  private orderedResults: NoteSearchItemData[]

  constructor(orderedResults: NoteSearchItemData[]) {
    super()

    this.orderedResults = orderedResults
  }

  resultsUpdated() {
    this.clearCollapsed()
    this.invalidate()
  }

  clearCollapsed() {
    this.collapsedResultIndexToCountMap.clear()
    this.collapsedRowCount = 0
  }

  setCollapsed(index: number, collapsed: boolean) {
    const { result } = this.getItemAtIndexImplementation(index)

    const resultIndex = this.orderedResults.indexOf(result)
    const prevCollapsed = this.collapsedResultIndexToCountMap.has(resultIndex)
    if (prevCollapsed === collapsed) {
      return
    }

    if (isNoteItem(result)) {
      if (collapsed) {
        this.collapsedResultIndexToCountMap.set(resultIndex, result.matchCount)
        this.collapsedRowCount += result.matchCount
      } else {
        this.collapsedResultIndexToCountMap.delete(resultIndex)
        this.collapsedRowCount -= result.matchCount
      }
    }

    this.invalidate()
  }

  setAllCollapsed() {
    this.clearCollapsed()
    for (const [resultIndex, result] of this.orderedResults.entries()) {
      if (!isNoteItem(result)) {
        continue
      }

      this.collapsedResultIndexToCountMap.set(resultIndex, result.matchCount)
      this.collapsedRowCount += result.matchCount
    }

    this.invalidate()
  }

  getAnyCollapsed() {
    return this.collapsedResultIndexToCountMap.size > 0
  }

  protected getItemAtIndexImplementation(index: number): Item {
    let resultIndex = -1
    let totalCollapsedRowCount = 0

    for (resultIndex = 0; resultIndex < this.orderedResults.length; resultIndex++) {
      if (resultIndex - totalCollapsedRowCount === index) {
        break
      }

      // Skip over collapsed rows
      const collapsedRowCount = this.collapsedResultIndexToCountMap.get(resultIndex)
      if (collapsedRowCount != null) {
        totalCollapsedRowCount += collapsedRowCount
        resultIndex += collapsedRowCount
      }
    }

    const result = this.orderedResults[resultIndex]
    assert(result, `No result found at index ${index}`)

    return {
      isCollapsed: this.collapsedResultIndexToCountMap.has(resultIndex),
      result,
    }
  }

  protected getItemCountImplementation(): number {
    return this.orderedResults.length - this.collapsedRowCount
  }
}
