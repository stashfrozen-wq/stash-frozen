import Link from 'next/link';
import { Home } from 'lucide-react';

export default function DashboardNotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <div className="p-4 bg-muted rounded-full">
                <Home className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Page not found</h2>
                <p className="text-muted-foreground max-w-md">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
            </div>
            <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
                <Home className="h-4 w-4" />
                Go to Dashboard
            </Link>
        </div>
    );
}
