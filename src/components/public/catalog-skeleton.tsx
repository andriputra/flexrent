import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dipakai sebagai fallback <Suspense> di halaman katalog, bukan loading.tsx:
 * boundary di atas halaman membuat notFound() kehilangan status 404-nya.
 */
export function CatalogSkeleton() {
  return (
    <>
      <div className="border-b bg-background">
        <div className="page-container space-y-3 py-14 sm:py-16">
          <Skeleton className="h-9 w-72 max-w-full sm:h-11" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>

      <div className="page-container -mt-10 space-y-5 pb-2 pt-10 sm:space-y-7">
        <Skeleton className="h-44 w-full rounded-2xl sm:h-40" />
        <Skeleton className="h-[76px] w-full rounded-2xl" />

        <div className="space-y-4 pt-1">
          <Skeleton className="h-6 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border/70">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-9 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
