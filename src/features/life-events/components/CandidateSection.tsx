"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { findLifeEventTemplate } from "../default-templates";
import {
  describeProcedureWhen,
  EMPTY_ANCHOR_DATES,
  type LifeEventAnchorDates,
} from "../timing";
import type { LifeEvent, LifeEventProcedure } from "../types";

type CandidateGroup = { lifeEvent: LifeEvent; items: LifeEventProcedure[] };

/**
 * 「候補」区分。テンプレ由来で未採用の項目を、ライフイベントごとに「採用」「見送り」で
 * 振り分ける。見送った項目は別の折りたたみに残り、採用に戻せる。
 * 採用・見送りするまで「これから」には載らない。
 */
export function CandidateSection({
  candidateGroups,
  skipped,
  anchorByLifeEventId,
  busy,
  onAdopt,
  onSkip,
}: {
  candidateGroups: CandidateGroup[];
  skipped: LifeEventProcedure[];
  anchorByLifeEventId: Map<string, LifeEventAnchorDates>;
  busy: boolean;
  onAdopt: (procedure: LifeEventProcedure) => void;
  onSkip: (procedure: LifeEventProcedure) => void;
}) {
  const candidateCount = candidateGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  if (candidateCount === 0 && skipped.length === 0) return null;

  const anchorFor = (procedure: LifeEventProcedure) =>
    anchorByLifeEventId.get(procedure.lifeEventId) ?? EMPTY_ANCHOR_DATES;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="textSecondary">
        候補
      </Typography>

      {candidateGroups.map(({ lifeEvent, items }) => (
        <Accordion key={lifeEvent.id} disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">
              {findLifeEventTemplate(lifeEvent.kind)?.title ?? lifeEvent.kind}
              から選ぶ（{items.length}件）
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {items.map((procedure) => (
              <CandidateRow
                key={procedure.id}
                procedure={procedure}
                anchor={anchorFor(procedure)}
                actions={
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => onAdopt(procedure)}
                    >
                      採用
                    </Button>
                    <Button
                      size="small"
                      disabled={busy}
                      onClick={() => onSkip(procedure)}
                    >
                      見送り
                    </Button>
                  </>
                }
              />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {skipped.length > 0 && (
        <Accordion disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">
              見送った項目（{skipped.length}件）
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {skipped.map((procedure) => (
              <CandidateRow
                key={procedure.id}
                procedure={procedure}
                anchor={anchorFor(procedure)}
                actions={
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy}
                    onClick={() => onAdopt(procedure)}
                  >
                    採用
                  </Button>
                }
              />
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}

function CandidateRow({
  procedure,
  anchor,
  actions,
}: {
  procedure: LifeEventProcedure;
  anchor: LifeEventAnchorDates;
  actions: ReactNode;
}) {
  const when = describeProcedureWhen(procedure, anchor);
  return (
    <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
      <Typography
        component="div"
        variant="body2"
        sx={{ overflowWrap: "break-word" }}
      >
        {procedure.title}
        {procedure.isGovernment && (
          <Chip label="行政手続き" size="small" sx={{ ml: 0.75 }} />
        )}
      </Typography>
      {when && (
        <Typography variant="caption" color="textSecondary">
          {when}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        {actions}
      </Stack>
    </Box>
  );
}
