const PHARMACY_STEPS = [
  { id: 0, label: "Upload" },
  { id: 1, label: "Create Ad" },
  { id: 2, label: "Audio" },
  { id: 3, label: "Video" },
  { id: 4, label: "Export" },
];

interface StepperProps {
  currentStep: number;
  maxReachableStep: number;
  onStepClick?: (step: number) => void;
  isStepComplete?: (stepId: number) => boolean;
  steps?: ReadonlyArray<{ id: number; label: string }>;
}

export function Stepper({
  currentStep,
  maxReachableStep,
  onStepClick,
  isStepComplete,
  steps = PHARMACY_STEPS,
}: StepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const complete = isStepComplete?.(step.id) ?? step.id < currentStep;
        const reachable = step.id <= maxReachableStep;
        const active = step.id === currentStep;

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={!reachable}
              className={`flex flex-col items-center ${
                reachable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  complete && !active
                    ? "bg-brand-500 text-white"
                    : active
                      ? "border-2 border-brand-500 bg-white text-brand-600"
                      : reachable
                        ? "border-2 border-gray-300 bg-white text-gray-600"
                        : "border-2 border-gray-300 bg-white text-gray-400"
                }`}
              >
                {complete && !active ? "✓" : step.id + 1}
              </div>
              <span
                className={`mt-1 text-center text-xs ${
                  active ? "font-medium text-brand-600" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  complete ? "bg-brand-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
