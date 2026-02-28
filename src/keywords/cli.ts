import { addKeyword, removeKeyword, loadKeywords } from './keywordManager.js'

const [command, ...args] = process.argv.slice(2)

function printUsage() {
  console.error('Usage:')
  console.error('  npm run keywords -- add "키워드" --category tech')
  console.error('  npm run keywords -- remove "키워드"')
  console.error('  npm run keywords -- list')
}

function handleAdd(args: string[]) {
  const term = args[0]
  if (!term) {
    console.error('Error: keyword term is required')
    printUsage()
    process.exit(1)
  }

  const categoryIdx = args.indexOf('--category')
  const category = categoryIdx !== -1 ? args[categoryIdx + 1] ?? 'general' : 'general'

  const keyword = addKeyword(term, category)
  console.error(`Added: "${keyword.term}" (category: ${keyword.category}, id: ${keyword.id})`)
}

function handleRemove(args: string[]) {
  const term = args[0]
  if (!term) {
    console.error('Error: keyword term is required')
    printUsage()
    process.exit(1)
  }

  const removed = removeKeyword(term)
  console.error(`Removed: "${removed.term}" (id: ${removed.id})`)
}

function handleList() {
  const keywords = loadKeywords()
  if (keywords.length === 0) {
    console.error('No keywords registered.')
    return
  }

  console.error(`\nRegistered keywords (${keywords.length}):`)
  for (const k of keywords) {
    console.error(`  [${k.category}] ${k.term} (id: ${k.id})`)
  }
  console.error('')
}

switch (command) {
  case 'add':
    handleAdd(args)
    break
  case 'remove':
    handleRemove(args)
    break
  case 'list':
    handleList()
    break
  default:
    console.error(`Unknown command: ${command}`)
    printUsage()
    process.exit(1)
}
