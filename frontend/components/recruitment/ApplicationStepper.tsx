interface ApplicationStepperProps {
  steps: string[];
  activeIndex: number;
}

export default function ApplicationStepper({ steps, activeIndex }: ApplicationStepperProps) {
  return (
    <ol className="bn-application-stepper" aria-label="Application progress">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === activeIndex ? "step" : undefined} className={index < activeIndex ? "is-complete" : index === activeIndex ? "is-current" : ""}>
          <span>{index < activeIndex ? "✓" : index + 1}</span><b>{step}</b>
        </li>
      ))}
    </ol>
  );
}
