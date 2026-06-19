export default function DashboardLayoutLoading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
        </div>
    );
}
