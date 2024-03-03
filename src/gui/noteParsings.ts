import { marked } from 'marked'
import { convert as htmlToText } from 'html-to-text'
import { NoteSearchItemData } from './NoteSearchListData'
import { ComplexTerm } from './searchProcessing'
import { Note } from 'src'

export const parsedNoteBodies = new Map<string, string>()

export const parseNoteBody = (noteBody: string) => {
  const htmlContent = marked.parse(noteBody) as string
  const strippedContent = htmlToText(htmlContent)
  return strippedContent
}

export const getParsedNoteBody = (noteBody: string) => {
  if (parsedNoteBodies.has(noteBody)) {
    return parsedNoteBodies.get(noteBody)
  }

  const parsed = parseNoteBody(noteBody)
  parsedNoteBodies.set(noteBody, parsed)
  return parsed
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

export const parseNote = (note: Note, parsedKeywords: (string | ComplexTerm)[]): NoteSearchItemData[] => {
  const results: NoteSearchItemData[] = []
  const indices: number[][] = []

  const strippedContent = getParsedNoteBody(note.body)

  // let fragments = ''

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
        // if (indices.length > 20) break
      }
    } else {
      // fragments = 'N/A'
    }
    // if (typeof keyword !== 'string' && 'valueRegex' in keyword) {
    //   const { valueRegex } = keyword

    // } else {
    //   fragments = 'N/A'
    // }
  }

  const mergedIndices = mergeOverlappingIntervals(indices, 3)
  const fragments = mergedIndices.map((f: any) => strippedContent.slice(f[0], f[1]))
  // Add trailing ellipsis if the final fragment doesn't end where the note is ending
  // if (mergedIndices.length && mergedIndices[mergedIndices.length - 1][1] !== strippedContent.length) {
  //   fragments += ' ...'
  // }

  if (fragments.length) {
    results.push({
      type: 'note',
      id: note.id,
      note,
      title: note.title,
      matchCount: fragments.length,
    })
  }

  for (const [index, fragment] of fragments.entries()) {
    results.push({
      type: 'fragment',
      id: `${note.id}-${index}`,
      noteId: note.id,
      fragment,
    })
  }

  return results
}
