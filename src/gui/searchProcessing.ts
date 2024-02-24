import { filterParser, Term } from './filterParser'

interface Terms {
  _: (string | ComplexTerm)[]
  title: (string | ComplexTerm)[]
  body: (string | ComplexTerm)[]
}

export interface ComplexTerm {
  type: 'regex' | 'text'
  value: string
  scriptType: any
  valueRegex?: string
}

function pregQuote(str: string, delimiter = '') {
  return `${str}`.replace(new RegExp(`[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\${delimiter || ''}-]`, 'g'), '\\$&')
}

function queryTermToRegex(term: any) {
  while (term.length && term.indexOf('*') === 0) {
    term = term.substr(1)
  }

  let regexString = pregQuote(term)
  if (regexString[regexString.length - 1] === '*') {
    regexString =
      `${regexString.substr(0, regexString.length - 2)}[^${pregQuote(' \t\n\r,.,+-*?!={}<>|:"\'()[]')}]` + '*?'
    // regexString = regexString.substr(0, regexString.length - 2) + '.*?';
  }

  return regexString
}

function parseQuery(query: string) {
  const trimQuotes = (str: string) => (str.startsWith('"') ? str.substr(1, str.length - 2) : str)

  let allTerms: Term[] = []

  try {
    allTerms = filterParser(query)
  } catch (error) {
    console.warn(error)
  }

  const textTerms = allTerms.filter((x) => x.name === 'text' && !x.negated).map((x) => trimQuotes(x.value))
  const titleTerms = allTerms.filter((x) => x.name === 'title' && !x.negated).map((x) => trimQuotes(x.value))
  const bodyTerms = allTerms.filter((x) => x.name === 'body' && !x.negated).map((x) => trimQuotes(x.value))

  const terms: Terms = { _: textTerms, title: titleTerms, body: bodyTerms }

  // Filter terms:
  // - Convert wildcards to regex
  // - Remove columns with no results
  // - Add count of terms

  let termCount = 0
  const keys = []
  for (const col2 in terms) {
    const col = col2 as '_' | 'title' | 'body'

    if (!terms.hasOwnProperty(col)) continue

    if (!terms[col].length) {
      delete terms[col]
      continue
    }

    for (let i = terms[col].length - 1; i >= 0; i--) {
      const term = terms[col][i] as string

      // SQlLite FTS doesn't allow "*" queries and neither shall we
      if (term === '*') {
        terms[col].splice(i, 1)
        continue
      }

      if (term.indexOf('*') >= 0) {
        terms[col][i] = {
          type: 'regex',
          value: term,
          scriptType: 'en', // scriptType(term),
          valueRegex: queryTermToRegex(term),
        }
      } else {
        terms[col][i] = { type: 'text', value: term, scriptType: 'en' /*scriptType(term)*/ }
      }
    }

    termCount += terms[col].length

    keys.push(col)
  }

  //
  // The object "allTerms" is used for query construction purposes (this
  // contains all the filter terms) Since this is used for the FTS match
  // query, we need to normalize text, title and body terms. Note, we're
  // not normalizing terms like tag because these are matched using SQL
  // LIKE operator and so we must preserve their diacritics.
  //
  // The object "terms" only include text, title, body terms and is used
  // for highlighting. By not normalizing the text, title, body in
  // "terms", highlighting still works correctly for words with
  // diacritics.
  //

  allTerms = allTerms.map((x) => {
    if (x.name === 'text' || x.name === 'title' || x.name === 'body') {
      return x
      // TODO normalize text
      // return { ...x, value: this.normalizeText_(x.value) }
    }
    return x
  })

  return {
    termCount: termCount,
    keys: keys,
    terms: terms, // text terms
    allTerms: allTerms,
    any: !!allTerms.find((term) => term.name === 'any'),
  }
}

type ParsedQuery = ReturnType<typeof parseQuery>

export function allParsedQueryTerms(parsedQuery: ParsedQuery) {
  if (!parsedQuery || !parsedQuery.termCount) return []

  let output: (string | ComplexTerm)[] = []
  for (const col in parsedQuery.terms) {
    if (!parsedQuery.terms.hasOwnProperty(col)) continue
    output = output.concat(parsedQuery.terms[col])
  }
  return output
}

export function keywords(searchQuery: string) {
  const parsedQuery = parseQuery(searchQuery)
  return allParsedQueryTerms(parsedQuery)
}
