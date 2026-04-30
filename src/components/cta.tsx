import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 sm:px-12 sm:py-20">
          {/* Background pattern */}
          <div className="absolute inset-0 -z-10 opacity-10">
            <svg
              className="h-full w-full"
              viewBox="0 0 1024 1024"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="512" cy="512" r="512" fill="url(#gradient)" fillOpacity="0.7" />
              <defs>
                <radialGradient id="gradient">
                  <stop stopColor="currentColor" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-background sm:text-4xl">
              Get interview-ready faster than ever
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-background/70">
              Join thousands of developers who have already landed their dream jobs 
              with Metric's AI-powered interview preparation.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                variant="secondary" 
                className="group h-12 px-8 text-base font-medium"
              >
                Start Your Interview Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
