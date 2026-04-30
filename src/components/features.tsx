import { 
  Brain, 
  FileText, 
  MessageSquare, 
  Code2, 
  TrendingUp, 
  BarChart3 
} from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI Mock Interviews",
    description: "Experience realistic interview simulations powered by advanced AI that adapts to your skill level.",
  },
  {
    icon: FileText,
    title: "Resume-Based Questions",
    description: "Get personalized questions generated from your resume, targeting your specific experience and skills.",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Feedback",
    description: "Receive instant, actionable feedback on your answers to improve your responses in real-time.",
  },
  {
    icon: Code2,
    title: "DSA & System Design",
    description: "Practice data structures, algorithms, and system design with interactive coding challenges.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Monitor your improvement over time with detailed metrics and performance history.",
  },
  {
    icon: BarChart3,
    title: "Interview Analytics",
    description: "Gain insights into your strengths and areas for improvement with comprehensive analytics.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border/40 bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to succeed
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Comprehensive tools designed to help you prepare for any technical interview 
            and land your dream job.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-foreground/10">
                <feature.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
