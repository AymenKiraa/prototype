const STEPS = ["Branding", "Location", "First pitch"];

export function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex gap-4 text-sm">
      {STEPS.map((label, i) => {
        const step = i + 1;
        return (
          <li
            key={label}
            className={step === current ? "font-semibold text-black dark:text-white" : "text-zinc-400"}
          >
            {step}. {label}
          </li>
        );
      })}
    </ol>
  );
}
