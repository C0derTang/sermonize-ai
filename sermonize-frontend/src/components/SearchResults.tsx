import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
        <BookOpen className="h-10 w-10 mb-4 text-muted-foreground/40" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground mb-1">No verses found yet</p>
        <p className="text-xs text-muted-foreground/60">
          Click "Find Verses" to search for supporting Scripture
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-4">
        {chunksByPoint.map(({ point, chunks: pointChunks }) => (
          <div key={point} className="animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
            <button
              onClick={() => togglePoint(point)}
              className="flex items-center gap-2 w-full text-left p-2 -mx-2 rounded-md hover:bg-secondary/50 transition-colors"
            >
              {expandedPoints.has(point) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{point}</span>
              <Badge
                variant="secondary"
                className="ml-auto text-xs px-2 py-0.5 bg-accent/10 text-accent-foreground"
              >
                {pointChunks.length}
              </Badge>
            </button>

            {expandedPoints.has(point) && (
              <div className="mt-3 space-y-2 pl-2">
                {pointChunks.map((chunk, idx) => (
                  <Card
                    key={`${chunk.reference}-${idx}`}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-px border-border/50 hover:border-accent/50 group"
                    onClick={() => onInsertVerse(`"${chunk.text}" (${chunk.reference})`)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          {chunk.reference}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5 font-normal group-hover:bg-accent/5"
                        >
                          {Math.round(chunk.similarity * 100)}% match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
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
    </div>
  )
}