import React, { useState, useEffect } from "react";
import lessonData from "../data/lesson-data.json";
import DOMPurify from "dompurify";

export default function MedicalLesson() {
  const [lessonId, setLessonId] = useState(1);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [generatedQuestions, setGeneratedQuestions] = useState({});
  const [disabledTextareas, setDisabledTextareas] = useState({});
  const [scores, setScores] = useState({});
  const [finalReport, setFinalReport] = useState(null);

  // Tracks whether all scenarios in the current lesson have been completed
  const [allCompleted, setAllCompleted] = useState(false);

  /**
   * 1) When lessonId changes, load the scenarios for that lesson.
   *    We do NOT reset the other state objects so we preserve any existing data
   *    for all lessons. We only reset scenarioIndex, finalReport, and allCompleted.
   */
  useEffect(() => {
    const selectedLesson = lessonData.find((l) => l[`lesson_${lessonId}`]);
    if (selectedLesson) {
      setScenarios(selectedLesson[`lesson_${lessonId}`]?.scenarios || []);
      setScenarioIndex(0);
      setAllCompleted(false);
      setFinalReport(null);
    }
  }, [lessonId]);

  /**
   * 2) If there's a scenario for the current scenarioIndex
   *    and we haven't generated a question for it yet, do so now.
   */
  useEffect(() => {
    const scenario = scenarios[scenarioIndex];
    if (scenario && !generatedQuestions[`${lessonId}-${scenarioIndex}`]) {
      handleGenerateQuestion(scenario.id);
    }
  }, [scenarioIndex, scenarios]);

  /**
   * 3) Check if all textareas in the current lesson are disabled => setAllCompleted(true).
   *    This effect runs whenever "scenarios", "disabledTextareas", or "lessonId" changes.
   */
  useEffect(() => {
    if (scenarios.length === 0) {
      setAllCompleted(false);
      return;
    }

    let disabledCount = 0;
    scenarios.forEach((_, idx) => {
      if (disabledTextareas[`${lessonId}-${idx}`]) {
        disabledCount++;
      }
    });

    // If the number of disabled textareas matches the total scenario count => all done
    if (disabledCount === scenarios.length) {
      setAllCompleted(true);
    } else {
      setAllCompleted(false);
    }
  }, [scenarios, disabledTextareas, lessonId]);

  /**
   * Generate an interview question for a given scenarioId.
   */
  const handleGenerateQuestion = async (scenarioId) => {
    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        body: JSON.stringify({ lessonId, scenarioId }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      setGeneratedQuestions((prev) => ({
        ...prev,
        [`${lessonId}-${scenarioIndex}`]: data.result,
      }));
    } catch (error) {
      console.error("Error generating question:", error);
    }
  };

  /**
   * Submit the student's answer for the current scenario.
   */
  const handleSubmitAnswer = async () => {
    const answerKey = `${lessonId}-${scenarioIndex}`;
    const answer = studentAnswers[answerKey]?.trim();
    if (!answer) return;

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        body: JSON.stringify({
          lessonId,
          scenarioId: scenarios[scenarioIndex].id,
          studentResponse: answer,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      // Extract score from response
      const match = data.result.match(/<p><strong>Score: <\/strong>(\d+)/);
      const score = match ? parseInt(match[1], 10) : 0;

      // Store the feedback HTML and score
      setFeedback((prev) => ({
        ...prev,
        [answerKey]: data.result,
      }));
      setScores((prev) => ({
        ...prev,
        [answerKey]: score,
      }));

      // Disable the current textarea
      setDisabledTextareas((prev) => ({
        ...prev,
        [answerKey]: true,
      }));
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  /**
   * Send all feedback for this lesson to OpenAI for a final summary/analysis.
   */
  const handleFinalReport = async () => {
    const totalScore = Object.keys(scores)
      .filter((key) => key.startsWith(`${lessonId}-`))
      .reduce((acc, key) => acc + scores[key], 0);

    const totalScenarios = scenarios.length || 1; // Avoid divide-by-zero
    const averageScore = (totalScore / totalScenarios).toFixed(1);

    // Combine feedback only for the current lesson
    const feedbackSummary = Object.keys(feedback)
      .filter((key) => key.startsWith(`${lessonId}-`))
      .map((key) => feedback[key])
      .join("\n");

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        body: JSON.stringify({
          lessonId,
          feedbackSummary,
          totalScore,
          averageScore,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      setFinalReport(data.result);
    } catch (error) {
      console.error("Error generating final report:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-0 sm:p-6 bg-white rounded-md sm:shadow-md">

      {/* === LESSON NAVIGATION === */}
      <div className="md:flex flex-row justify-between mb-4">
        <button
          onClick={() => setLessonId((prev) => Math.max(prev - 1, 1))}
          disabled={lessonId === 1}
          className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 md:w-1/3 w-1/2 ${
            lessonId === 1 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          ◀ Prev Level
        </button>
        <button
          onClick={() =>
            setLessonId((prev) => Math.min(prev + 1, lessonData.length))
          }
          disabled={lessonId === lessonData.length}
          className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 w-1/2 md:w-1/3 ${
            lessonId === lessonData.length
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          Next Level ▶
        </button>
      </div>

      {/* === LESSON TITLE & TOPIC === */}
      {lessonData[lessonId - 1] &&
        lessonData[lessonId - 1][`lesson_${lessonId}`] && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              {lessonData[lessonId - 1][`lesson_${lessonId}`].title}
            </h3>
            <p className="text-gray-600">
              {lessonData[lessonId - 1][`lesson_${lessonId}`].topic}
            </p>
          </div>
        )}

      {/* === FINAL REPORT BUTTON === */}
      {allCompleted && !finalReport && (
        <button
          onClick={handleFinalReport}
          className="mt-4 px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-700 w-full"
        >
          Final Raport
        </button>
      )}

      {/* === DISPLAY FINAL REPORT === */}
      {finalReport && (
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <h2 className="text-xl font-semibold mb-2">🏁 Final Report</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(finalReport),
            }}
          />
        </div>
      )}        

      {/* === SCENARIO DISPLAY & ANSWER SUBMISSION === */}
      <div className="border border-black rounded p-5 mt-8 inline-block w-full">
        {/* SCENARIO NAVIGATION */}
        <div className="flex-row md:flex justify-between mb-4">
          <button
            onClick={() => setScenarioIndex((prev) => Math.max(prev - 1, 0))}
            disabled={scenarioIndex === 0}
            className={`px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 w-1/7 ${
              scenarioIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            ◀
          </button>
          <button
            onClick={() =>
              setScenarioIndex((prev) =>
                Math.min(prev + 1, scenarios.length - 1)
              )
            }
            disabled={scenarioIndex >= scenarios.length - 1}
            className={`px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 w-1/7 ${
              scenarioIndex >= scenarios.length - 1
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            ▶
          </button>
        </div>

        {/* GENERATED INTERVIEW QUESTION */}
        {generatedQuestions[`${lessonId}-${scenarioIndex}`] && (
          <div className="p-4 bg-gray-100 rounded mb-4">
            <p>
              <strong>Essay {scenarioIndex + 1}</strong>
            </p>
            <p>
              <strong>📝</strong>{" "}
              {generatedQuestions[`${lessonId}-${scenarioIndex}`]}
            </p>
          </div>
        )}

        {/* TEXTAREA FOR THE USER’S ANSWER */}
        <textarea
          style= {{ height: "215px" }}
          className="w-full p-2 border rounded mb-4"
          placeholder="Type your response..."
          value={studentAnswers[`${lessonId}-${scenarioIndex}`] || ""}
          onChange={(e) =>
            setStudentAnswers((prev) => ({
              ...prev,
              [`${lessonId}-${scenarioIndex}`]: e.target.value,
            }))
          }
          disabled={!!disabledTextareas[`${lessonId}-${scenarioIndex}`]}
        />

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmitAnswer}
          disabled={!!disabledTextareas[`${lessonId}-${scenarioIndex}`]}
          className={`px-4 py-2 rounded bg-green-500 text-white hover:bg-green-700 w-full mb-4 ${
            disabledTextareas[`${lessonId}-${scenarioIndex}`]
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          Submit
        </button>

        {/* FEEDBACK AFTER SUBMISSION */}
        {feedback[`${lessonId}-${scenarioIndex}`] && (
          <div className="p-4 bg-green-100 rounded">
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  feedback[`${lessonId}-${scenarioIndex}`]
                ),
              }}
            />
          </div>
        )}
      </div>


    </div>
  );
}
