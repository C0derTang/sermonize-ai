import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SearchResult {
  reference: string
  text: string
  similarity: number
  matched_point: string
  chunk_type: string
}

interface SearchResultsProps {
  points: string[]
  chunks: SearchResult[]
  onInsertVerse: (text: string) => void
}

export function SearchResults({ points, chunks, onInsertVerse }: SearchResultsProps) {
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set(points))

  const togglePoint = (point: string) => {
    const newExpanded = new Set(expandedPoints)
    if (newExpanded.has(point)) {
      newExpanded.delete(point)
    } else {
      newExpanded.add(point)
    }
    setExpandedPoints(newExpanded)
  }

  const chunksByPoint = points.map(point => ({
    point,
    chunks: chunks.filter(c => c.matched_point === point),
  }))

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p>Click "Find Verses" to search for Bible verses</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {chunksByPoint.map(({ point, chunks: pointChunks }) => (
          <div key={point}>
            <button
              onClick={() => togglePoint(point)}
              className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-muted"
            >
              {expandedPoints.has(point) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">{point}</span>
              <Badge variant="secondary" className="ml-auto">
                {pointChunks.length}
              </Badge>
            </button>

            {expandedPoints.has(point) && (
              <div className="mt-2 space-y-2 pl-6">
                {pointChunks.map((chunk, idx) => (
                  <Card
                    key={`${chunk.reference}-${idx}`}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onInsertVerse(`"${chunk.text}" (${chunk.reference})`)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{chunk.reference}</CardTitle>
                        <Badge variant="outline">
                          {Math.round(chunk.similarity * 100)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {chunk.text}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}