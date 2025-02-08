import OpenAI from "openai";
import fs from "fs";
import path from "path";

const lessonFilePath = path.join(process.cwd(), "data", "lesson-data.json");
const lessons = JSON.parse(fs.readFileSync(lessonFilePath, "utf-8"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const {
    lessonId,        // e.g. 1, 2, 3, or 4
    scenarioId,
    studentResponse,
    feedbackSummary,
    totalScore,
    averageScore
  } = req.body;

  /**
   * 1) Handle the "Final Report":
   *    This does not involve scenarioId or studentResponse.
   */
  if (feedbackSummary) {
    const lesson = lessons.find((l) => l[`lesson_${lessonId}`]);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found for final summary." });
    }

    const lessonData = lesson[`lesson_${lessonId}`];

    const finalPrompt = `
      You are a highly qualified English teacher reviewing the student's performance for Lesson ${lessonData.lesson}.
      The combined feedback for each written scenario is provided below:

      ---
      ${feedbackSummary}
      ---

      The total score is ${totalScore}, and the average score is ${averageScore}.

      Please provide a concise final analysis, highlighting the student’s strengths and areas for improvement 
      regarding grammar, vocabulary, structure, and overall writing proficiency.
      Conclude with a brief recommendation on how well they've met the Lesson ${lessonData.lesson} objectives.

      Output in HTML format:
      <div>
        <h3>Final Analysis</h3>
        <p>[Your concise summary here]</p>
      </div>
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: finalPrompt }],
        temperature: 0.1,
      });

      return res.status(200).json({ result: response.choices[0].message.content });
    } catch (error) {
      console.error("OpenAI Final Summary Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * 2) If not the final report, we either generate a scenario question
   *    OR evaluate/correct the student's writing.
   */
  if (!lessonId || !scenarioId) {
    return res.status(400).json({ error: "Missing lessonId or scenarioId." });
  }

  const lesson = lessons.find((l) => l[`lesson_${lessonId}`]);
  if (!lesson) {
    return res.status(404).json({ error: "Lesson not found." });
  }

  const lessonData = lesson[`lesson_${lessonId}`];
  const scenario = lessonData.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found." });
  }

  let prompt;

  // 2a) No student response => generate the scenario prompt
  if (!studentResponse) {
    prompt = `
      You are a highly qualified English teacher who specializes in grammar, vocabulary, and literature.
      Based on the scenario below, generate ONE clear, detailed essay prompt for the student to practice their writing skills.
      The prompt must reflect the specific topic or theme of the scenario.

      **Scenario**: "${scenario.title} - ${scenario.description}"

      **Lesson Objectives**:
      ${lessonData.learning_objectives.join("\n")}

      **Lesson Overview**:
      ${lessonData.introduction.join("\n")}

      Provide the prompt directly, in a concise manner.
    `;
  } 
  // 2b) We have a studentResponse => Evaluate/correct the essay
  else {
    prompt = `
      You are a highly qualified English teacher, an expert in grammar, vocabulary, and literary style.
      A student has written the following essay/response:

      **Student's Response:** "${studentResponse}"

      Please evaluate this writing. Focus on:
      - **Grammar & Vocabulary**: Correct any mistakes and suggest improvements.
      - **Clarity & Coherence**: Check paragraph structure, logical flow, and clarity of expression.
      - **Style & Tone**: Is it appropriate for a standard academic or creative essay? Suggest enhancements if needed.
      - **Overall Impression**: Provide an overall assessment of the essay’s strengths and areas for improvement.

      **Important**: In your output, use HTML format with these sections:
      <div>
        <p><strong>Score: </strong>[1-10]</p>
        <p><strong>Feedback: </strong>[Explain errors, grammar points, structure, etc.]</p>
        <hr style="padding-bottom:20px;" />
        <p><strong>Your Version: </strong>
          [Reproduce the student's text, but for incorrect/extra words use:
           <span style="color:red; text-decoration:line-through;">INCORRECT_WORD</span>]
        </p>

        <p><strong>Corrected Version: </strong>
          [Rewrite with corrections. For newly corrected or added words, use:
           <span style="color:green;"><strong>CORRECT_WORD</strong></span>]
        </p>
        <hr style="padding-top:20px;" />
        <p><strong>Native Speaker Version: </strong>
          [Rewrite the text to sound natural, idiomatic, and fluent, as if by a native speaker]
        </p>
      </div>

      **Scoring Rules**:
      - Score **1-3**: Significantly flawed, very poor grammar, unclear structure.
      - Score **4-6**: Noticeable issues, needs considerable improvement.
      - Score **7-8**: Generally good, only minor errors or style concerns.
      - Score **9-10**: Excellent in grammar, clarity, coherence, and style.

      Make sure to:
      - Highlight only the incorrect or extra words in red strikethrough in "Your Version."
      - Highlight only the newly corrected/added words in green bold in "Corrected Version."
      - Provide a separate "Native Speaker Version" that is more idiomatic and fluent.
    `;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    return res.status(200).json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
