import { marked } from 'marked'
import { convert as htmlToText } from 'html-to-text'
import { NoteSearchItemData } from './NoteSearchListData'
import { ComplexTerm } from './searchProcessing'
import { Note } from 'src'
import indexToPosition from 'index-to-position'

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

export function previousWhitespaceIndex(s: string, begin: number) {
  // returns index of the previous whitespace character
  const i = s.slice(0, begin).search(/\s$/)
  return i < 0 ? 0 : i
}

export const parseNote = (
  note: Note,
  parsedKeywords: (string | ComplexTerm)[],
  titlesOnly: boolean,
): NoteSearchItemData[] => {
  const results: NoteSearchItemData[] = []
  const fragmentMatches: { fragment: string; line: number }[] = []

  const strippedContent = getParsedNoteBody(note.body)

  if (!titlesOnly) {
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
        const fullLineRegexpString = `(\r?\n)*(?<line>(?<linePrefix>.*)(?<searchMatch>${valueRegex}).*)\r?\n?`

        for (const match of strippedContent.matchAll(new RegExp(fullLineRegexpString, 'ig'))) {
          const { groups = {} } = match
          const { line, searchMatch, linePrefix } = groups

          if (line && searchMatch && linePrefix) {
            // Arbitrarily do 15 characters on either side, expanded to word boundaries.
            const fragmentStart = previousWhitespaceIndex(line, linePrefix.length - 15)
            const fragmentEnd = nextWhitespaceIndex(line, linePrefix.length + searchMatch.length + 15)
            fragmentMatches.push({
              fragment: line.slice(fragmentStart, fragmentEnd),
              line: indexToPosition(strippedContent, match.index).line,
            })
          }
        }
      }
    }
  }

  if (titlesOnly || fragmentMatches.length) {
    results.push({
      type: 'note',
      id: note.id,
      note,
      title: note.title,
      matchCount: fragmentMatches.length,
    })
  }

  for (const [index, match] of fragmentMatches.entries()) {
    results.push({
      type: 'fragment',
      id: `${note.id}-${index}`,
      noteId: note.id,
      fragment: match.fragment,
      line: match.line,
    })
  }

  return results
}
