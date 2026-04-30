import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useInterviewData } from '../hooks/useInterviewData';
import { CheckCircle2, XCircle, Clock, Zap, AlertTriangle, ChevronDown, ChevronUp, Bot } from "lucide-react";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
  .animate-slideUp { animation: slideUp 0.3s ease-out; }

  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #111; border-radius: 3px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

  .resize-handle { cursor: ns-resize; }
  .resize-handle:hover .resize-bar { background: #3b82f6; }
  body.resizing { cursor: ns-resize !important; user-select: none; }

  .submission-banner {
    background: linear-gradient(90deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%);
    background-size: 200% auto;
  }
`;

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Example {
  id: string;
  problemId: string;
  exampleNum: number;
  exampleText: string;
  images: string[];
}

interface TestCase {
  id: string;
  problemId: string;
  input: Record<string, any>;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
  createdAt: string;
}

interface Problem {
  id: string;
  metricId: string;
  title: string;
  difficulty: string;
  description: string;
  constraints: string[];
  hints: string[];
  followUps: string[];
}

interface CodeSnippets {
  python?: string;
  java?: string;
  cpp?: string;
  javascript?: string;
}

interface APIResponse {
  problem: Problem;
  examples: Example[];
  test_cases: TestCase[];
  codeSnippets: CodeSnippets;
}

interface SubmissionResult {
  passedCount: number;
  totalCount: number;
  verdict: string;
  failedCase?: {
    input: string;
    expected: string;
    actual: string;
  };
  output: string;
  stderr: string | null;
  compileOutput: string | null;
}

interface CodeEditorProps {
  problemMetadata?: APIResponse | null;
  userId?: string;
  interviewId?: string;
  onCodeSubmitted?: (code: string, language: string, result: SubmissionResult) => void;
  questionNumber?: number;
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const d = difficulty.toUpperCase();
  const cls =
    d === "EASY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
      d === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
        "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wider uppercase ${cls}`}>
      {difficulty}
    </span>
  );
};

// ─── Verdict display inside editor panel ─────────────────────────────────────
const VerdictBanner = ({
  result,
  type,
  onDismiss,
}: {
  result: SubmissionResult;
  type: "run" | "submit";
  onDismiss?: () => void;
}) => {
  const isPass = result.verdict === "Pass";
  const isCompile = result.verdict === "COMPILATION_ERROR";
  const isTLE = result.verdict === "TIME_LIMIT_EXCEEDED";
  const isRuntime = result.verdict === "RUNTIME_ERROR";

  const icon = isPass
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
    : isCompile ? <AlertTriangle className="w-4 h-4 text-yellow-400 flex-none" />
      : isTLE ? <Clock className="w-4 h-4 text-orange-400 flex-none" />
        : <XCircle className="w-4 h-4 text-red-400 flex-none" />;

  const label = isPass ? (type === "submit" ? "Accepted" : "All Visible Tests Passed") :
    isCompile ? "Compilation Error" :
      isTLE ? "Time Limit Exceeded" :
        isRuntime ? "Runtime Error" : "Wrong Answer";

  const color = isPass ? "border-emerald-500/20 bg-emerald-500/[0.06]" :
    isCompile ? "border-yellow-500/20 bg-yellow-500/[0.06]" :
      isTLE ? "border-orange-500/20 bg-orange-500/[0.06]" :
        "border-red-500/20 bg-red-500/[0.06]";

  return (
    <div className={`animate-slideUp border rounded-xl overflow-hidden ${color}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-white">{label}</span>
          {!isCompile && !isTLE && !isRuntime && (
            <span className="text-xs text-slate-500 ml-1">
              {result.passedCount}/{result.totalCount} cases
            </span>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-slate-600 hover:text-slate-400 transition-colors ml-4">
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error output */}
      {(isCompile || isRuntime) && result.output && (
        <div className="px-4 pb-3">
          <pre className="text-xs font-mono text-red-300/80 bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
            {result.output}
          </pre>
        </div>
      )}

      {/* Failed case */}
      {!isPass && result.failedCase && (
        <div className="px-4 pb-3 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">First failing case</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-slate-600 mb-1">Input</div>
              <code className="block bg-black/30 text-blue-300 p-2 rounded-lg font-mono truncate">{result.failedCase.input}</code>
            </div>
            <div>
              <div className="text-slate-600 mb-1">Expected</div>
              <code className="block bg-black/30 text-emerald-300 p-2 rounded-lg font-mono truncate">{result.failedCase.expected}</code>
            </div>
            <div>
              <div className="text-slate-600 mb-1">Got</div>
              <code className="block bg-black/30 text-red-300 p-2 rounded-lg font-mono truncate">{result.failedCase.actual}</code>
            </div>
          </div>
        </div>
      )}

      {/* Accepted celebration */}
      {isPass && type === "submit" && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400/80">
            All {result.totalCount} test cases passed — Alex will follow up with you now.
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const CodeEditor = ({
  problemMetadata,
  userId: propUserId,
  interviewId: propInterviewId,
  onCodeSubmitted,
  questionNumber = 1,
}: CodeEditorProps) => {
  const { interviewData } = useInterviewData();

  const userId = propUserId || interviewData.userId;
  const interviewId = propInterviewId || interviewData.interviewId;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippets>({});
  const [code, setCode] = useState<string>("// Write your solution here...");
  const [loading, setLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("cpp");
  const [languageId, setLanguageId] = useState<number>(54);
  const [activeTab, setActiveTab] = useState<'description' | 'testcases'>('description');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [runResult, setRunResult] = useState<SubmissionResult | null>(null);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [consoleHeight, setConsoleHeight] = useState<number>(38);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Reset editor state when problem changes (new question)
  useEffect(() => {
    if (!problemMetadata) return;

    setProblem(problemMetadata.problem);
    setExamples(problemMetadata.examples || []);
    setTestCases(problemMetadata.test_cases || []);
    setCodeSnippets(problemMetadata.codeSnippets || {});

    // Reset to C++ snippet for new question
    const snippet = problemMetadata.codeSnippets?.cpp || "// Write your solution here...";
    setCode(snippet);
    setLanguage("cpp");
    setLanguageId(54);

    // Clear previous results
    setSubmissionResult(null);
    setRunResult(null);
    setShowConsole(false);
    setActiveTab('description');
  }, [problemMetadata?.problem?.id]); // key on problem ID — only re-run on real question change

  // Language change
  const handleLanguageChange = (id: number, langKey: string) => {
    setLanguageId(id);
    setLanguage(langKey);
    const key = langKey as keyof CodeSnippets;
    if (codeSnippets[key]) setCode(codeSnippets[key] || "");
  };

  // Run
  const handleRun = async () => {
    if (!problem) return;
    setLoading(true);
    setShowConsole(true);
    setRunResult(null);
    setSubmissionResult(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: code, languageId, problemId: problem.id, language, interviewId, userId }),
      });
      setRunResult(await res.json());
    } catch (err) {
      console.error("Run error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!problem) return;
    setLoading(true);
    setRunResult(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/code/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: code, languageId, problemId: problem.id, language, interviewId, userId }),
      });
      const result: SubmissionResult = await res.json();
      setSubmissionResult(result);
      setShowConsole(false); // hide console — show verdict banner in editor area instead
 
      onCodeSubmitted?.(code, language, result);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prevent accidental navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Resize console
  const handleMouseDown = () => setIsResizing(true);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const container = document.getElementById('editor-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((rect.bottom - e.clientY) / rect.height) * 100;
      setConsoleHeight(Math.min(Math.max(pct, 18), 65));
    };
    const onUp = () => { setIsResizing(false); document.body.classList.remove('resizing'); };
    if (isResizing) {
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    return () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  if (!problem) {
    return (
      <div className="relative flex items-center justify-center h-full bg-[#0a0a0a] text-white overflow-hidden">
        {/* Blurry background code snippet */}
        <div className="absolute inset-0 opacity-[0.15] blur-[4px] pointer-events-none select-none overflow-hidden">
          <pre className="p-12 font-mono text-sm text-indigo-400">
{`import java.util.*;

class Solution {
    // Waiting for the AI interviewer to assign a task
    public int solveProblem(int[] nums, int target) {
        // Your logic will go here
        
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}

// Ensure you listen carefully to the constraints
// and clarify edge cases before coding.`}
          </pre>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5 bg-black/60 p-10 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl animate-slideUp">
          <div className="relative w-16 h-16 rounded-full border-2 border-indigo-500/20 flex flex-col items-center justify-center">
             <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
             <Bot className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Preparing Editor</h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Waiting for Aria to select the perfect question for your curriculum...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const monacoLang = language === "python" ? "python" : language === "java" ? "java" : language === "cpp" ? "cpp" : "javascript";

  return (
    <>
      <style>{styles}</style>
      <div className="flex h-full bg-[#0a0a0a] text-gray-200 overflow-hidden">

        {/* ── LEFT: Problem panel ── */}
        <div className="w-[46%] flex flex-col border-r border-white/[0.06] bg-[#0d0d0d] h-full">

          {/* Problem title bar */}
          <div className="flex-none px-5 py-3 border-b border-white/[0.06] bg-[#0f0f0f] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center flex-none">
                <span className="text-[10px] font-bold text-indigo-400">{questionNumber}</span>
              </div>
              <h2 className="text-sm font-semibold text-white truncate">{problem.title}</h2>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>

            {/* Tabs */}
            <div className="flex flex-none bg-white/[0.04] rounded-lg p-0.5">
              {(['description', 'testcases'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all capitalize ${activeTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-slate-400'
                    }`}
                >
                  {tab === 'testcases' ? 'Tests' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'description' ? (
              <div className="p-5 space-y-6">
                {/* Description */}
                <p className="text-[13.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {problem.description}
                </p>

                {/* Examples */}
                {examples.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Examples</h4>
                    {examples.map((ex) => (
                      <div key={ex.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
                        <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">{ex.exampleNum}</span>
                          <span className="text-xs font-semibold text-slate-400">Example {ex.exampleNum}</span>
                        </div>
                        <pre className="p-4 text-[12.5px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed text-left overflow-x-auto">
                          {ex.exampleText}
                        </pre>
                        {ex.images?.[0] && (
                          <img src={ex.images[0]} alt="example" className="border-t border-white/[0.06] max-w-full h-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints.length > 0 && (
                  <div className="space-y-3 pb-6">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Constraints</h4>
                    <div className="rounded-xl border border-white/[0.06] p-4 space-y-2">
                      {problem.constraints.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 mt-1.5 flex-none" />
                          <code className="text-[12px] font-mono text-slate-400">{c}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 space-y-3 pb-6">
                {testCases.filter(tc => !tc.isHidden).length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-sm">No visible test cases</div>
                ) : testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                  <div key={tc.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{idx + 1}</span>
                      <span className="text-xs font-semibold text-slate-400">Case {idx + 1}</span>
                      <span className="ml-auto text-[10px] text-emerald-500 font-medium">Visible</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {Object.entries(tc.input).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-[11px] text-slate-600 font-mono">{key} =</span>
                          <div className="mt-1 bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
                            <code className="text-[12px] text-blue-300 font-mono">{JSON.stringify(value, null, 2)}</code>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-white/[0.06] pt-3">
                        <span className="text-[11px] text-slate-600 font-mono">expected output =</span>
                        <div className="mt-1 bg-black/30 rounded-lg p-2.5 border border-emerald-500/[0.08]">
                          <code className="text-[12px] text-emerald-300 font-mono">{tc.expectedOutput}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Editor + Console ── */}
        <div id="editor-container" className="flex-1 flex flex-col bg-[#0d0d0d] h-full relative overflow-hidden">

          {/* Toolbar */}
          <div className="flex-none flex justify-between items-center px-4 py-2.5 bg-[#0f0f0f] border-b border-white/[0.06]">
            <select
              className="bg-white/[0.05] text-slate-300 text-[12px] border border-white/[0.08] rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.05] transition-all cursor-pointer"
              value={languageId}
              onChange={(e) => {
                const val = Number(e.target.value);
                const key = val === 71 ? "python" : val === 62 ? "java" : val === 54 ? "cpp" : "javascript";
                handleLanguageChange(val, key);
              }}
            >
              <option value={54}>C++</option>
              <option value={63}>JavaScript</option>
              <option value={71}>Python 3</option>
              <option value={62}>Java</option>
            </select>

            <div className="flex items-center gap-2">
              {/* Run button */}
              <button
                onClick={handleRun}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
                {loading ? "Running..." : "Run"}
              </button>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {/* Submission result banner — shown ABOVE the editor, not as an overlay */}
          {submissionResult && (
            <div className="flex-none px-4 pt-3 animate-slideUp">
              <VerdictBanner
                result={submissionResult}
                type="submit"
                onDismiss={() => setSubmissionResult(null)}
              />
            </div>
          )}

          {/* Editor */}
          <div
            className="transition-all duration-150 overflow-hidden"
            style={{ flex: showConsole ? "none" : 1, height: showConsole ? `${100 - consoleHeight}%` : undefined }}
          >
            <Editor
              height="100%"
              theme="vs-dark"
              language={monacoLang}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                fontLigatures: true,
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                scrollbar: { verticalScrollbarSize: 6 },
              }}
            />
          </div>

          {/* Console */}
          {showConsole && (
            <div
              className="flex flex-col bg-[#080808] border-t border-white/[0.06]"
              style={{ height: `${consoleHeight}%` }}
            >
              {/* Resize handle */}
              <div
                className="resize-handle flex-none h-1.5 flex items-center justify-center group cursor-ns-resize"
                onMouseDown={handleMouseDown}
              >
                <div className="resize-bar w-10 h-0.5 bg-white/10 group-hover:bg-blue-500 rounded-full transition-colors" />
              </div>

              {/* Console header */}
              <div className="flex-none px-4 py-2 bg-[#0f0f0f] border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Test Output</span>
                <button
                  onClick={() => setShowConsole(false)}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Console content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-slate-500">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-indigo-500 animate-spin" />
                    <span className="text-sm">Running tests...</span>
                  </div>
                ) : runResult ? (
                  <VerdictBanner result={runResult} type="run" onDismiss={() => setRunResult(null)} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    Click Run to test your code against visible cases
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show console toggle when hidden */}
          {!showConsole && (
            <button
              onClick={() => setShowConsole(true)}
              className="flex-none flex items-center justify-center gap-1.5 py-1.5 border-t border-white/[0.06] bg-[#0f0f0f] text-[11px] text-slate-600 hover:text-slate-400 hover:bg-white/[0.03] transition-colors w-full"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              {runResult
                ? `Show output · ${runResult.passedCount}/${runResult.totalCount} passed`
                : "Show console"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};