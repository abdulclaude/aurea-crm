import "server-only";

import { and, desc, eq, getTableColumns, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  externalFormSubmission,
  formSubmission,
  funnel,
  funnelEvent,
  funnelSession,
  funnelWebVital,
} from "@/db/schema";
import type { VisitorPrivacyInput } from "@/features/external-funnels/lib/visitor-privacy-contract";

import {
  eventSubjectPredicate,
  locationPredicate,
  MAX_VISITOR_EXPORT_ROWS,
  profileSubjectPredicate,
  resolveVisitorProfiles,
  visitorSubject,
  type VisitorScope,
} from "./visitor-privacy-common";

export async function exportVisitorData(
  scope: VisitorScope,
  input: VisitorPrivacyInput,
) {
  const { profiles, selectedFunnelName } = await resolveVisitorProfiles(
    scope,
    input,
  );
  const subject = visitorSubject(profiles);
  const sessionMatch = profileSubjectPredicate(subject);
  const eventMatch = eventSubjectPredicate(subject);

  const [sessions, events, webVitals, formSubmissions] = await Promise.all([
    db
      .select({ ...getTableColumns(funnelSession), funnelName: funnel.name })
      .from(funnelSession)
      .innerJoin(funnel, eq(funnel.id, funnelSession.funnelId))
      .where(
        and(
          eq(funnel.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, funnel.locationId),
          locationPredicate(scope.locationId, funnelSession.locationId),
          sessionMatch,
        ),
      )
      .orderBy(desc(funnelSession.startedAt), desc(funnelSession.id))
      .limit(MAX_VISITOR_EXPORT_ROWS + 1),
    db
      .select({ ...getTableColumns(funnelEvent), funnelName: funnel.name })
      .from(funnelEvent)
      .innerJoin(funnel, eq(funnel.id, funnelEvent.funnelId))
      .where(
        and(
          eq(funnel.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, funnel.locationId),
          locationPredicate(scope.locationId, funnelEvent.locationId),
          eventMatch,
        ),
      )
      .orderBy(desc(funnelEvent.timestamp), desc(funnelEvent.id))
      .limit(MAX_VISITOR_EXPORT_ROWS + 1),
    db
      .select({ ...getTableColumns(funnelWebVital), funnelName: funnel.name })
      .from(funnelWebVital)
      .innerJoin(
        funnelSession,
        and(
          eq(funnelSession.funnelId, funnelWebVital.funnelId),
          eq(funnelSession.sessionId, funnelWebVital.sessionId),
        ),
      )
      .innerJoin(funnel, eq(funnel.id, funnelWebVital.funnelId))
      .where(
        and(
          eq(funnel.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, funnel.locationId),
          locationPredicate(scope.locationId, funnelWebVital.locationId),
          sessionMatch,
        ),
      )
      .orderBy(desc(funnelWebVital.timestamp), desc(funnelWebVital.id))
      .limit(MAX_VISITOR_EXPORT_ROWS + 1),
    db
      .select({
        ...getTableColumns(externalFormSubmission),
        funnelName: funnel.name,
      })
      .from(externalFormSubmission)
      .innerJoin(funnel, eq(funnel.id, externalFormSubmission.funnelId))
      .where(
        and(
          eq(externalFormSubmission.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, externalFormSubmission.locationId),
          eq(funnel.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, funnel.locationId),
          or(
            inArray(externalFormSubmission.anonymousId, subject.anonymousIds),
            subject.identifiedUserIds.length > 0
              ? inArray(externalFormSubmission.userId, subject.identifiedUserIds)
              : undefined,
          ),
        ),
      )
      .orderBy(
        desc(externalFormSubmission.submittedAt),
        desc(externalFormSubmission.id),
      )
      .limit(MAX_VISITOR_EXPORT_ROWS + 1),
  ]);

  const mirrorIds = formSubmissions.flatMap((submission) =>
    submission.mirroredFormSubmissionId
      ? [submission.mirroredFormSubmissionId]
      : [],
  );
  const mirroredFormSubmissions =
    mirrorIds.length > 0
      ? await db
          .select()
          .from(formSubmission)
          .where(
            and(
              eq(formSubmission.organizationId, scope.organizationId),
              locationPredicate(scope.locationId, formSubmission.locationId),
              inArray(formSubmission.id, mirrorIds),
            ),
          )
          .orderBy(desc(formSubmission.submittedAt), desc(formSubmission.id))
          .limit(MAX_VISITOR_EXPORT_ROWS + 1)
      : [];
  const truncate = <Row>(rows: Row[]) => rows.slice(0, MAX_VISITOR_EXPORT_ROWS);

  return {
    exportedAt: new Date(),
    requestedFromFunnel: { id: input.funnelId, name: selectedFunnelName },
    scope,
    profiles,
    sessions: truncate(sessions),
    events: truncate(events),
    webVitals: truncate(webVitals),
    formSubmissions: truncate(formSubmissions),
    mirroredFormSubmissions: truncate(mirroredFormSubmissions),
    partial: {
      sessions: sessions.length > MAX_VISITOR_EXPORT_ROWS,
      events: events.length > MAX_VISITOR_EXPORT_ROWS,
      webVitals: webVitals.length > MAX_VISITOR_EXPORT_ROWS,
      formSubmissions: formSubmissions.length > MAX_VISITOR_EXPORT_ROWS,
      mirroredFormSubmissions:
        mirroredFormSubmissions.length > MAX_VISITOR_EXPORT_ROWS,
    },
  };
}
