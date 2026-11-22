import { Skeleton } from "@/components/ui/skeleton"

export default function BookingStatusLoading() {
  return (
    <div>
      <div className="border-b border-border/70 bg-background">
        <div className="page-container space-y-3 pb-14 pt-10 sm:pt-12">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-52" />
        </div>
      </div>
      <div className="page-container -mt-11 space-y-4 pb-6 sm:-mt-12">
        <Skeleton className="h-[104px] w-full rounded-2xl" />
        <div className="grid items-start gap-4 pt-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
