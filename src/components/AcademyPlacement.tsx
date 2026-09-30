import { useMemo, useState } from "react";
import {
  clearPlacement,
  loadPlacement,
  PLACEMENT_QUESTIONS,
  recommendedStart,
  savePlacement,
  scorePlacement,
  type PlacementAnswer,
  type PlacementResult,
} from "../lib/academyPlacement";

type AcademySection =
  | "pieces"
  | "decisions"
  | "schools"
  | "responses"
  | "endgames"
  | "review"
  | "openings"
  | "strategy"
  | "universe";

type Props = {
  onNavigate: (section: AcademySection) => void;
  onPlacementChange?: (result: PlacementResult | null) => void;
};

export function AcademyPlacement({ onNavigate, onPlacementChange }: Props) {
  const [existing, setExisting] = useState(() => loadPlacement());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [completeResult, setCompleteResult] = useState<PlacementResult | null>(null);

  const question = PLACEMENT_QUESTIONS[questionIndex];
  const selected = useMemo(
    () => question?.answers.find((answer) => answer.id === selectedAnswer) ?? null,
    [question, selectedAnswer]
  );

  const chooseAnswer = (answerId: string) => {
    if (selectedAnswer) return;
    const answer = question.answers.find((item) => item.id === answerId);
    if (!answer) return;

    setSelectedAnswer(answerId);
    setFeedback(answer.explanation);
  };

  const nextQuestion = () => {
    if (!selectedAnswer) return;
    const nextAnswers = [
      ...answers.filter((answer) => answer.questionId !== question.id),
      { questionId: question.id, answerId: selectedAnswer },
    ];

    if (questionIndex >= PLACEMENT_QUESTIONS.length - 1) {
      const result = scorePlacement(nextAnswers);
      savePlacement(result);
      setAnswers(nextAnswers);
      setCompleteResult(result);
      setExisting(result);
      onPlacementChange?.(result);
      return;
    }

    setAnswers(nextAnswers);
    setQuestionIndex((index) => index + 1);
    setSelectedAnswer(null);
    setFeedback("");
  };

  const restart = () => {
    clearPlacement();
    setExisting(null);
    setCompleteResult(null);
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setFeedback("");
    onPlacementChange?.(null);
  };

  const result = completeResult ?? existing;

  if (result) {
    const start = recommendedStart(result.level);
    const levelCopy = result.level === "Beginner"
      ? "Start with movement, piece jobs, and simple tactical thinking before layering in opening and endgame ideas."
      : result.level === "Developing"
        ? "You know the basics. Start with piece quality and opponent-response training, then build opening and endgame plans."
        : "You are ready for threat recognition, multi-step calculation, opening ideas, endgames, and adaptive review.";

    return (
      <section className="placement-result-card">
        <div>
          <div className="eyebrow">PLACEMENT COMPLETE</div>
          <h2>{result.level}</h2>
          <p>{levelCopy}</p>
        </div>

        <div className="placement-score">
          <strong>{result.score}<span>/{result.total}</span></strong>
          <small>placement score</small>
        </div>

        <div className="placement-actions">
          <button className="primary-action" onClick={() => onNavigate(start)}>
            Start recommended path
          </button>
          <button className="secondary-action" onClick={restart}>Retake placement</button>
        </div>
      </section>
    );
  }

  return (
    <section className="placement-card">
      <div className="placement-header">
        <div>
          <div className="eyebrow">QUICK PLACEMENT</div>
          <h2>Start where the chess makes sense.</h2>
          <p>
            Six short knowledge questions place you into a recommended Academy path.
            This is not an Elo rating — it only decides where the teaching should begin.
          </p>
        </div>
        <span>{questionIndex + 1}/{PLACEMENT_QUESTIONS.length}</span>
      </div>

      <div className="placement-progress-track">
        <span style={{ width: `${((questionIndex + (selectedAnswer ? 1 : 0)) / PLACEMENT_QUESTIONS.length) * 100}%` }} />
      </div>

      <article className="placement-question">
        <span>{question.concept}</span>
        <h3>{question.prompt}</h3>
        <div className="placement-answer-grid">
          {question.answers.map((answer) => (
            <button
              type="button"
              key={answer.id}
              className={selectedAnswer === answer.id ? (answer.correct ? "selected correct" : "selected incorrect") : ""}
              onClick={() => chooseAnswer(answer.id)}
              disabled={Boolean(selectedAnswer)}
            >
              {answer.label}
            </button>
          ))}
        </div>
      </article>

      {selected ? (
        <div className={selected.correct ? "placement-feedback correct" : "placement-feedback incorrect"}>
          <strong>{selected.correct ? "✓ Good read" : "Not quite"}</strong>
          <span>{feedback}</span>
        </div>
      ) : null}

      <button className="primary-action" disabled={!selectedAnswer} onClick={nextQuestion}>
        {questionIndex === PLACEMENT_QUESTIONS.length - 1 ? "See my path" : "Next question"}
      </button>
    </section>
  );
}
