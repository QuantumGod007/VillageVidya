import { curriculum } from "../data/curriculum";
import {
  learnerGrades,
  languageOptions,
  subjectOptions,
  type BoardId,
  type LearnerGrade,
} from "../domain/curriculum";
import type { Language, Subject } from "../domain/types";
import { useStore } from "../lib/store";
import "./academic-context.css";
export function AcademicContextPicker({
  subject,
  onChange,
}: {
  subject?: Subject;
  onChange?: () => void;
}) {
  const { data, setPreferences } = useStore();
  return (
    <fieldset className="academic-context">
      <legend>Your academic context</legend>
      <label>
        Board
        <select
          value={data.boardId}
          onChange={(e) => {
            onChange?.();
            setPreferences({ boardId: e.target.value as BoardId });
          }}
        >
          {curriculum.boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Grade
        <select
          value={data.grade}
          onChange={(e) => {
            onChange?.();
            setPreferences({ grade: Number(e.target.value) as LearnerGrade });
          }}
        >
          {learnerGrades.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subject
        <select
          value={subject ?? data.subject}
          onChange={(e) => {
            onChange?.();
            setPreferences({ subject: e.target.value as Subject });
          }}
        >
          {subjectOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Language
        <select
          value={data.language}
          onChange={(e) => {
            onChange?.();
            setPreferences({ language: e.target.value as Language });
          }}
        >
          {languageOptions.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <p>
        Resources and progress follow these choices. Other grades’ saved work
        stays on this device. English practice only; translations have not been
        added.
      </p>
    </fieldset>
  );
}
export function CoverageNote() {
  const { data } = useStore();
  return (
    <p className="academic-coverage">
      {curriculum.boards.find((b) => b.id === data.boardId)?.coverage}{" "}
      {data.language !== "English" &&
        `No lessons in ${data.language} yet. Choose English to read the available sample.`}
    </p>
  );
}
