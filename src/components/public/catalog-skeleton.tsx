import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dipakai sebagai fallback <Suspense> di halaman katalog, bukan loading.tsx:
 * boundary di atas halaman membuat notFound() kehilangan status 404-nya.
 */
export function CatalogSkeleton() {
  return (
    <>
      <div className="overflow-hidden bg-ink">
        <div className="page-container pt-20 pb-28 sm:pt-24 sm:pb-32">
          <div className="h-7 w-52 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 space-y-2.5">
            <div className="h-9 w-[18ch] max-w-full animate-pulse rounded-lg bg-white/10 sm:h-11" />
            <div className="h-9 w-[13ch] max-w-full animate-pulse rounded-lg bg-white/10 sm:h-11" />
          </div>
          <div className="mt-6 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <div className="page-container -mt-16 space-y-6 pb-16 sm:-mt-20 sm:space-y-8 sm:pb-20">
        <Skeleton className="h-44 w-full rounded-2xl ring-1 ring-accent/15 sm:h-40" />
        <Skeleton className="h-[76px] w-full rounded-2xl" />

        <div className="space-y-5">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 sm:gap-5">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border/70">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-2/3 sm:h-5" />
                    <Skeleton className="h-3 w-1/2 sm:h-4" />
                  </div>
                  <div className="flex gap-1 sm:gap-1.5">
                    <Skeleton className="h-5 w-12 rounded-full sm:h-6 sm:w-16" />
                    <Skeleton className="h-5 w-12 rounded-full sm:h-6 sm:w-16" />
                  </div>
                  <Skeleton className="h-6 w-2/3 sm:h-7 sm:w-1/3" />
                  <Skeleton className="h-8 w-full rounded-full sm:h-9" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
