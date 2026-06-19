const barHeights = ['51%', '58%', '65%', '72%', '43%', '50%', '57%'];

const getBarStyle = (height: string) => ({ height });

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                        <div className="h-3 w-24 bg-muted animate-pulse rounded mb-3" />
                        <div className="h-7 w-32 bg-muted animate-pulse rounded mb-2" />
                        <div className="h-2 w-20 bg-muted animate-pulse rounded" />
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2].map((i) => (
                    <div key={i} className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-xl h-12 w-12 animate-pulse" />
                            <div className="flex-1">
                                <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" />
                                <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="h-6 w-40 bg-muted animate-pulse rounded mb-8" />
                    <div className="flex items-end gap-3 h-[220px] border-b border-border/50 pb-2">
                        {barHeights.map((height, i) => (
                            <div key={i} className="flex-1 bg-muted/50 animate-pulse rounded-t-lg" style={getBarStyle(height)} />
                        ))}
                    </div>
                </div>
                <div className="col-span-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="h-4 w-28 bg-muted animate-pulse rounded mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3">
                                <div className="flex-1">
                                    <div className="h-3 w-24 bg-muted animate-pulse rounded mb-2" />
                                    <div className="h-2 w-32 bg-muted animate-pulse rounded" />
                                </div>
                                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-lg h-10 w-10 animate-pulse" />
                    <div>
                        <div className="h-3 w-24 bg-muted animate-pulse rounded mb-2" />
                        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-5 rounded-2xl bg-secondary/10 border border-border">
                            <div className="h-4 w-16 bg-muted animate-pulse rounded mb-4" />
                            <div className="h-3 w-full bg-muted animate-pulse rounded mb-2" />
                            <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
