import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dipakai sebagai fallback <Suspense> di halaman katalog, bukan loading.tsx:
 * boundary di atas halaman membuat notFound() kehilangan status 404-nya.
 */
export function CatalogSkeleton() {
  return (
    <div className="page-container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="space-y-3 rounded-2xl border p-4">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
