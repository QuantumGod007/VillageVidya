import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  GraduationCap,
  Users,
  Heart,
  ShieldCheck,
  Settings2,
  Check,
  LockKeyhole,
  BookOpen,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonLink, Eyebrow } from "../components/ui";
import { profileSchema } from "../domain/learning";
import type { Role } from "../domain/types";
import { demoProfiles } from "../data/demo";
import { useStore } from "../lib/store";
import { roleHome } from "../components/layout";
const roleIcons = {
  learner: GraduationCap,
  tutor: Users,
  guardian: Heart,
  champion: ShieldCheck,
  admin: Settings2,
};
function selectedRole(value: string | null): Role {
  return value && Object.hasOwn(demoProfiles, value)
    ? (value as Role)
    : "learner";
}
export function Auth({ onboarding = false }: { onboarding?: boolean }) {
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(selectedRole(params.get("role")));
  const [stage, setStage] = useState(0);
  const [real, setReal] = useState(false);
  const { login, data, setPreferences } = useStore();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof profileSchema>,
    unknown,
    z.output<typeof profileSchema>
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      grade: data.grade,
      language: data.language,
      subject: data.subject,
      fictionalOnly: false,
    },
  });
  function enter() {
    login(role);
    navigate(roleHome[role]);
  }
  return (
    <div className="container auth-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        Back to the village
      </Link>
      <div className="auth-layout">
        <div className="auth-visual">
          <Eyebrow>A PLACE TO LEARN. A PLACE TO BELONG.</Eyebrow>
          <h2>
            Every big
            <br />
            “I can”
            <br />
            starts with
            <br />
            <em>a little help.</em>
          </h2>
          <div className="auth-illustration">
            <BookOpen size={94} strokeWidth={0.8} />
            <span>आओ, साथ सीखें।</span>
            <p>Come, let’s learn together.</p>
          </div>
          <div className="auth-visual-footer">
            <span>ROOTED IN TRUST</span>
            <span>OPEN TO POSSIBILITY ↗</span>
          </div>
        </div>
        <div className="auth-content">
          <Eyebrow>
            {onboarding
              ? "YOUR FIRST SMALL STEP"
              : "WELCOME TO YOUR LEARNING VILLAGE"}
          </Eyebrow>
          <h1>
            {stage === 1
              ? "Make this space yours."
              : onboarding
                ? "There’s a place for you here."
                : "Good to have you here."}
          </h1>
          <p className="muted">
            {stage === 1
              ? "Choose preferences for the fictional demo. No personal information needed."
              : "Explore with a fictional profile. See how a little learning can bring people together."}
          </p>
          <div className="demo-notice">
            <span className="status-dot" />
            <span>Interactive demo · no real account needed</span>
          </div>
          {real ? (
            <div className="registration-closed">
              <LockKeyhole size={27} />
              <h2>Real registration is not open yet.</h2>
              <p>
                Before we welcome real learners, secure guardian consent, SMS
                verification, and child-safety services must be connected. We
                never substitute a demo checkmark for real consent.
              </p>
              <Button variant="outline" onClick={() => setReal(false)}>
                Explore a fictional profile <ArrowUpRight size={17} />
              </Button>
            </div>
          ) : stage === 0 ? (
            <>
              <div
                className="role-options"
                role="group"
                aria-label="Choose a fictional role"
              >
                {(Object.keys(demoProfiles) as Role[]).map((r) => {
                  const Icon = roleIcons[r];
                  return (
                    <button
                      className={`role-option ${role === r ? "selected" : ""}`}
                      key={r}
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                    >
                      <span className="role-icon">
                        <Icon size={21} />
                      </span>
                      <span>
                        <strong>{demoProfiles[r].label}</strong>
                        <small>{demoProfiles[r].description}</small>
                      </span>
                      <span className="radio-mark">
                        {role === r && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                className="full-width"
                onClick={() => (onboarding ? setStage(1) : enter())}
              >
                Explore as {demoProfiles[role].name}
                <ArrowUpRight size={17} />
              </Button>
              <p className="auth-fine-print">
                All people and verification states are fictional. Demo sessions
                expire after 15 minutes.
              </p>
              <button
                className="text-link auth-real-link"
                onClick={() => setReal(true)}
              >
                Looking to create a real account? <ArrowUpRight size={14} />
              </button>
            </>
          ) : (
            <form
              className="onboarding-form"
              onSubmit={handleSubmit((values) => {
                setPreferences({
                  grade: values.grade,
                  language: values.language,
                  subject: values.subject,
                });
                enter();
              })}
            >
              <div className="fictional-profile">
                <span>{demoProfiles[role].name[0]}</span>
                <div>
                  <strong>{demoProfiles[role].name}</strong>
                  <small>
                    Fictional {demoProfiles[role].label.toLowerCase()} profile
                  </small>
                </div>
                <ShieldCheck size={20} />
              </div>
              <label className="field">
                Academic grade
                <select {...register("grade")}>
                  {Array.from({ length: 9 }, (_, i) => (
                    <option key={i} value={i + 4}>
                      Grade {i + 4}
                    </option>
                  ))}
                </select>
                {errors.grade && (
                  <span className="field-error">
                    Choose a grade from 4 to 12.
                  </span>
                )}
              </label>
              <div className="form-row">
                <label className="field">
                  Learning language
                  <select {...register("language")}>
                    {["English", "हिन्दी", "मराठी", "తెలుగు"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Start with
                  <select {...register("subject")}>
                    {[
                      "Mathematics",
                      "Science",
                      "English",
                      "Social Science",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="consent-preview">
                <LockKeyhole size={18} />
                <div>
                  <strong>Consent & verification: demo only</strong>
                  <p>
                    This profile cannot connect to real learners. No SMS or
                    identity check is performed.
                  </p>
                </div>
              </div>
              <label className="checkbox-field">
                <input type="checkbox" {...register("fictionalOnly")} />
                <span>
                  I understand this is a fictional demo, not a real verified
                  account.
                </span>
              </label>
              {errors.fictionalOnly && (
                <p className="field-error">{errors.fictionalOnly.message}</p>
              )}
              <Button className="full-width" type="submit">
                Enter my learning space
                <ArrowUpRight size={17} />
              </Button>
              <Button variant="ghost" type="button" onClick={() => setStage(0)}>
                <ArrowLeft size={15} />
                Choose a different role
              </Button>
            </form>
          )}
          <div className="auth-bottom">
            <ShieldCheck size={16} />
            <span>Only learning preferences are saved on this device.</span>
          </div>
        </div>
      </div>
      {!onboarding && (
        <p className="auth-switch">
          New here?{" "}
          <ButtonLink to="/onboarding" variant="ghost">
            Find your place <ArrowUpRight size={14} />
          </ButtonLink>
        </p>
      )}
    </div>
  );
}
