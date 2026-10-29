import { useEffect, useState } from "react";
import { ButtonLink, EmptyState } from "../components/ui";
import { lessonsFor, type CurriculumCatalog } from "../domain/curriculum";
import { useAccount, type RealAccess } from "../lib/auth/provider";
import { useLearnerWorkspace } from "../lib/data-access/use-learner-workspace";
import { useTutorWorkspace } from "../lib/data-access/use-tutor-workspace";
import { enrollmentContext } from "./learner-workspace";
import { LearningAssistant } from "./learning-assistant";

async function accessToken(access: RealAccess) {
  const session = await access.client.auth.getSession();
  return session.data.session?.access_token ?? null;
}

function LearnerAssistant({ access }: { access: RealAccess }) {
  const workspace = useLearnerWorkspace(access);
  const data = workspace.data;
  const active = data?.enrollments.find((enrollment) => enrollment.is_active);
  const context = data ? enrollmentContext(data.catalog, active) : null;
  if (workspace.loading)
    return <p role="status">Loading your academic context…</p>;
  if (workspace.error || !data)
    return (
      <EmptyState
        title="Your academic context could not be loaded."
        description="Check your connection and refresh before asking the learning assistant."
      />
    );
  if (!context)
    return (
      <EmptyState
        title="Choose an academic context first."
        description="The learning assistant uses your saved, published board, grade, subject, and language."
      >
        <ButtonLink to="/learn">Choose academic preferences</ButtonLink>
      </EmptyState>
    );
  return (
    <LearningAssistant
      context={context}
      library={lessonsFor(data.catalog.lessons, context)}
      assessments={data.catalog.assessments}
      getAccessToken={() => accessToken(access)}
    />
  );
}

function TutorAssistant({ access }: { access: RealAccess }) {
  const workspace = useTutorWorkspace(access);
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  useEffect(() => {
    let active = true;
    void access.curriculum
      .load()
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, [access]);
  if (workspace.loading || !catalog)
    return <p role="status">Loading your teaching context…</p>;
  if (workspace.error || catalogError || !workspace.data)
    return (
      <EmptyState
        title="Your teaching context could not be loaded."
        description="Refresh your workspace before asking the learning assistant."
      />
    );
  const qualification = workspace.data.subjects[0];
  const subject = catalog.subjects.find(
    (item) => item.id === qualification?.subject_id,
  );
  const grade = catalog.grades.find((item) => item.id === subject?.gradeId);
  const language = workspace.data.languages[0]?.language;
  if (!subject || !grade || !language)
    return (
      <EmptyState
        title="A qualified teaching context is needed."
        description="Add a published subject qualification and language in your tutor workspace before using the learning assistant."
      >
        <ButtonLink to="/studio">Open Tutor Studio</ButtonLink>
      </EmptyState>
    );
  const context = {
    boardId: grade.boardId,
    grade: grade.number,
    subject: subject.name,
    language,
  };
  return (
    <LearningAssistant
      context={context}
      library={lessonsFor(catalog.lessons, context)}
      assessments={catalog.assessments}
      getAccessToken={() => accessToken(access)}
    />
  );
}

export function AccountAssistant() {
  const { account, access } = useAccount();
  if (!account || !access) return null;
  if (account.roles.includes("learner"))
    return <LearnerAssistant access={access} />;
  if (account.roles.includes("tutor")) return <TutorAssistant access={access} />;
  return (
    <EmptyState
      title="This assistant is for learning and tutoring contexts."
      description="Your current account does not have a permitted learner or tutor role."
    />
  );
}
