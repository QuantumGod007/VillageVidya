import { tutors } from "../data/demo";
import { sessionScore, updateTSS, progression } from "../domain/learning";
import { useStore } from "./store";
export function useTutorCatalog() {
  const { data, completed } = useStore();
  return tutors.map((tutor) => {
    const history = completed.filter((session) => session.tutorId === tutor.id);
    const result = history.reduce(
      (previous, session, index) => {
        const score = updateTSS(
          previous.score,
          sessionScore(session.evaluation),
        );
        const growth = progression(
          score,
          tutor.sessions + index + 1,
          previous.tier,
          previous.belowFloorSessions,
        );
        return {
          score,
          tier: growth.tier,
          belowFloorSessions: growth.belowFloorSessions,
        };
      },
      { score: tutor.tss, tier: tutor.tier, belowFloorSessions: 0 },
    );
    return {
      ...tutor,
      tss: result.score,
      sessions: tutor.sessions + history.length,
      tier: result.tier,
      available: tutor.id === "aditi" ? data.available : tutor.available,
    };
  });
}
