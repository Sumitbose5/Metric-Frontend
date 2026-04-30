import { Upload, Play, LineChart } from "lucide-react"

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Resume",
    description: "Upload your resume and let our AI analyze your background to create personalized interview questions.",
  },
  {
    icon: Play,
    step: "02",
    title: "Start AI Interview",
    description: "Begin your mock interview session with our AI interviewer that adapts to your responses in real-time.",
  },
  {
    icon: LineChart,
    step: "03",
    title: "Get Feedback & Improve",
    description: "Review detailed feedback, track your progress, and continuously improve your interview skills.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Get interview-ready in three simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-14 hidden h-px w-full bg-border lg:block" />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                {/* Step number and icon */}
                <div className="relative mb-6">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-border bg-background">
                    <step.icon className="h-10 w-10 text-foreground" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                    {step.step.replace("0", "")}
                  </span>
                </div>

                {/* Content */}
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
