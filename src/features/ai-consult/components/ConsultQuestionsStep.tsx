"use client";

import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import type { ConsultQuestion } from "../types";

/** 質問に答える段階。全問選ぶと「提案を出す」が押せる。 */
export function ConsultQuestionsStep({
  questions,
  answers,
  onAnswer,
  onSubmit,
}: {
  questions: ConsultQuestion[];
  answers: Record<number, string>;
  onAnswer: (index: number, answer: string) => void;
  onSubmit: () => void;
}) {
  const complete = questions.every((_, i) => answers[i] !== undefined);

  return (
    <Stack spacing={3} sx={{ py: 2 }}>
      {questions.map((question, i) => (
        <FormControl key={question.text}>
          <FormLabel id={`consult-question-${i}`} sx={{ mb: 0.5 }}>
            {question.text}
          </FormLabel>
          <RadioGroup
            aria-labelledby={`consult-question-${i}`}
            value={answers[i] ?? ""}
            onChange={(event) => onAnswer(i, event.target.value)}
          >
            {question.options.map((option) => (
              <FormControlLabel
                key={option}
                value={option}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
        </FormControl>
      ))}
      <Button variant="contained" disabled={!complete} onClick={onSubmit}>
        提案を出す
      </Button>
    </Stack>
  );
}
