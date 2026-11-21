import { Skeleton } from "@/components/ui/skeleton"

export default function BookingStatusLoading() {
  return (
    <div className="page-container max-w-xl space-y-5 py-10 sm:py-14">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}
