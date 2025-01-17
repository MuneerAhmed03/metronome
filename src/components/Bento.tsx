import React from "react";
import {
  ArrowUpRight,
  MessageSquare,
  Mic,
  Brain,
  Lightbulb,
  Target,
  Book,
  Volume2,
  Sparkles,
  Clock,
  Activity,
  Timer,
  X,
} from "lucide-react";
import { BentoCardProps } from "@/models/type";

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  tooltip,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  unit: string;
  tooltip: string;
}) {
  return (
    <div className="group relative flex items-center gap-3 bg-white/50 backdrop-blur-sm px-4 py-3 rounded-2xl hover:bg-white/70 transition-colors">
      <Icon className="w-4 h-4 text-gray-400" />
      <div className="flex items-baseline gap-1.5">
        <span className="hidden sm:inline-block text-sm font-medium text-gray-500">
          {title}:
        </span>
        <span className="text-base font-semibold text-gray-700">{value}</span>
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
      {tooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function BentoCard({
  title,
  items,
  icon: Icon,
  className,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={`p-6 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <ArrowUpRight className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 text-sm leading-relaxed">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dashboard({
  analysisData,
  onClose,
}: {
  analysisData: BentoCardProps;
  onClose: () => void;
}) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 bg-gray-50 rounded-t-3xl shadow-2xl transform transition-transform duration-500 ease-in-out h-[90vh] overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 z-10 px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Speech Analysis Dashboard
              </h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Close dashboard"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-2 gap-4 mt-6 sm:flex sm:flex-wrap sm:gap-4">
            <MetricCard
              title="Duration"
              value={formatDuration(analysisData.metrics.duration)}
              unit="min"
              icon={Clock}
              tooltip="Speech duration"
            />
            <MetricCard
              title="Speaking Rate"
              value={analysisData.metrics.wpm}
              unit="wpm"
              icon={Activity}
              tooltip="Words per minute"
            />
            <MetricCard
              title="Total Pauses"
              value={analysisData.metrics.pauses.totalPauses}
              unit="pauses"
              icon={Timer}
              tooltip="Total number of pauses"
            />

            <MetricCard
              title="Long Pauses"
              value={analysisData.metrics.pauses.longPauses}
              unit="total"
              icon={Timer}
              tooltip="Pauses longer than 3 seconds"
            />
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Detailed Feedback - First */}
            <BentoCard
              title="Clarity & Articulation"
              items={
                analysisData.speechAnalysis.detailedFeedback
                  .clarityAndArticulation
              }
              icon={Brain}
              className="h-full"
            />
            <BentoCard
              title="Pace & Rhythm"
              items={analysisData.speechAnalysis.detailedFeedback.paceAndRhythm}
              icon={Target}
              className="h-full"
            />
            <BentoCard
              title="Confidence & Delivery"
              items={
                analysisData.speechAnalysis.detailedFeedback
                  .confidenceAndDelivery
              }
              icon={Volume2}
              className="h-full"
            />

            {/* Areas for Improvement */}
            <div className="lg:col-span-2">
              <BentoCard
                title="Delivery Improvements"
                items={analysisData.speechAnalysis.areasForImprovement.delivery}
                icon={Mic}
                className="h-full"
              />
            </div>
            <BentoCard
              title="Language Improvements"
              items={
                analysisData.speechAnalysis.areasForImprovement.languageUse
              }
              icon={MessageSquare}
              className="h-full"
            />

            {/* Recommendations */}
            <div className="lg:col-span-2">
              <BentoCard
                title="Delivery Recommendations"
                items={analysisData.speechAnalysis.recommendations.delivery}
                icon={Lightbulb}
                className="h-full bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100"
              />
            </div>
            <BentoCard
              title="Language Recommendations"
              items={analysisData.speechAnalysis.recommendations.languageUse}
              icon={Book}
              className="h-full bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100"
            />

            {/* Key Takeaways */}
            <div className="lg:col-span-3">
              <BentoCard
                title="Key Takeaways"
                items={analysisData.speechAnalysis.keyTakeaways}
                icon={Sparkles}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
