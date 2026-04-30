"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-32 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>AI-Powered Interview Practice</span>
          </div>

          {/* Headline */}
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Ace Your Interviews with{" "}
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              AI-Powered Practice
            </span>
          </h1>

          {/* Subtext */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Simulate real interviews, get instant feedback on your responses, and track your 
            progress over time. Perfect for developers preparing for their dream job.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="group h-12 px-8 text-base font-medium">
              Start Your Interview
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium bg-transparent">
              View Features
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold tracking-tight">10K+</span>
              <span className="mt-1 text-sm text-muted-foreground">Interviews Completed</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold tracking-tight">95%</span>
              <span className="mt-1 text-sm text-muted-foreground">Success Rate</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold tracking-tight">500+</span>
              <span className="mt-1 text-sm text-muted-foreground">Companies Covered</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
