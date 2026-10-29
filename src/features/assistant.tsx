import { useSearchParams } from "react-router-dom";
import { lessons } from "../data/demo";
import { curriculum } from "../data/curriculum";
import { useStore } from "../lib/store";
import { lessonsFor } from "../domain/curriculum";
import { LearningAssistant } from "./learning-assistant";

export function Assistant() {
  const [params] = useSearchParams();
  const { data } = useStore();
  const library = lessonsFor(lessons, data);
  const chosen = library.find((lesson) => lesson.id === params.get("topic"));
  return (
    <LearningAssistant
      key={`${data.boardId}-${data.grade}-${data.subject}-${data.language}`}
      context={data}
      library={library}
      assessments={curriculum.assessments}
      initialQuestion={
        chosen ? `Help me understand ${chosen.title.toLowerCase()}` : ""
      }
    />
  );
}
