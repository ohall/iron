import type { Program } from "../types";

interface ProgramCardProps {
  program: Program;
  onSelect: (program: Program) => void;
}

export function ProgramCard({ program, onSelect }: ProgramCardProps) {
  return (
    <button className="program-card" onClick={() => onSelect(program)} type="button">
      <div className="program-card__status">{program.status}</div>
      <h3>{program.name}</h3>
      <p>{program.goal}</p>
      <div className="program-card__meta">
        <span>{program.days_per_week} days/week</span>
        <span>{program.experience_level}</span>
      </div>
    </button>
  );
}
