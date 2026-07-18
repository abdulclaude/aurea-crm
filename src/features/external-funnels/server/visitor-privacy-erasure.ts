import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, exists, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  anonymousUserProfiles,
  externalFormSubmission,
  formSubmission,
  funnel,
  funnelEvent,
  funnelSession,
  funnelWebVital,
} from "@/db/schema";
import type { VisitorPrivacyInput } from "@/features/external-funnels/lib/visitor-privacy-contract";
import { removeRealtimeEventsForSubjects } from "@/lib/realtime-cache";

import {
  eventSubjectPredicate,
  locationPredicate,
  profileSubjectPredicate,
  resolveVisitorProfiles,
  scopeFunnelExists,
  visitorSubject,
  type VisitorScope,
} from "./visitor-privacy-common";

const subjectSession = alias(funnelSession, "privacy_subject_session");

export async function eraseVisitorData(
  scope: VisitorScope,
  input: VisitorPrivacyInput,
) {
  const { profiles } = await resolveVisitorProfiles(scope, input);
  const subject = visitorSubject(profiles);
  const sessionMatch = profileSubjectPredicate(subject);
  const eventMatch = eventSubjectPredicate(subject);
  const scopedFunnels = await db
    .select({ id: funnel.id })
    .from(funnel)
    .where(
      and(
        eq(funnel.organizationId, scope.organizationId),
        locationPredicate(scope.locationId, funnel.locationId),
      ),
    );

  const result = await db.transaction(async (tx) => {
    const erasedAt = new Date();
    const webVitals = await tx
      .delete(funnelWebVital)
      .where(
        and(
          locationPredicate(scope.locationId, funnelWebVital.locationId),
          scopeFunnelExists(scope, funnelWebVital.funnelId),
          or(
            inArray(funnelWebVital.anonymousId, subject.anonymousIds),
            exists(
              db
                .select({ id: subjectSession.id })
                .from(subjectSession)
                .where(
                  and(
                    eq(subjectSession.funnelId, funnelWebVital.funnelId),
                    eq(subjectSession.sessionId, funnelWebVital.sessionId),
                    or(
                      inArray(subjectSession.profileId, subject.profileIds),
                      inArray(subjectSession.anonymousId, subject.anonymousIds),
                    ),
                  ),
                ),
            ),
          ),
        ),
      )
      .returning({ id: funnelWebVital.id });
    const externalForms = await tx
      .delete(externalFormSubmission)
      .where(
        and(
          eq(externalFormSubmission.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, externalFormSubmission.locationId),
          scopeFunnelExists(scope, externalFormSubmission.funnelId),
          or(
            inArray(externalFormSubmission.anonymousId, subject.anonymousIds),
            subject.identifiedUserIds.length > 0
              ? inArray(externalFormSubmission.userId, subject.identifiedUserIds)
              : undefined,
          ),
        ),
      )
      .returning({
        id: externalFormSubmission.id,
        mirroredFormSubmissionId: externalFormSubmission.mirroredFormSubmissionId,
      });
    const mirrorIds = externalForms.flatMap((submission) =>
      submission.mirroredFormSubmissionId
        ? [submission.mirroredFormSubmissionId]
        : [],
    );
    const mirroredForms =
      mirrorIds.length > 0
        ? await tx
            .delete(formSubmission)
            .where(
              and(
                eq(formSubmission.organizationId, scope.organizationId),
                locationPredicate(scope.locationId, formSubmission.locationId),
                inArray(formSubmission.id, mirrorIds),
              ),
            )
            .returning({ id: formSubmission.id })
        : [];
    const events = await tx
      .delete(funnelEvent)
      .where(
        and(
          locationPredicate(scope.locationId, funnelEvent.locationId),
          scopeFunnelExists(scope, funnelEvent.funnelId),
          eventMatch,
        ),
      )
      .returning({ id: funnelEvent.id });
    const sessions = await tx
      .delete(funnelSession)
      .where(
        and(
          locationPredicate(scope.locationId, funnelSession.locationId),
          scopeFunnelExists(scope, funnelSession.funnelId),
          sessionMatch,
        ),
      )
      .returning({ id: funnelSession.id });
    const tombstones = await tx
      .update(anonymousUserProfiles)
      .set({
        displayName: "Erased visitor",
        identifiedAt: null,
        identifiedUserId: null,
        lifecycleStage: null,
        tags: [],
        userProperties: {},
        consentGiven: false,
        consentTimestamp: null,
        totalEvents: 0,
        totalSessions: 0,
        deletionRequestedAt: erasedAt,
        firstSeen: erasedAt,
        lastSeen: erasedAt,
      })
      .where(
        and(
          eq(anonymousUserProfiles.organizationId, scope.organizationId),
          locationPredicate(scope.locationId, anonymousUserProfiles.locationId),
          inArray(anonymousUserProfiles.id, subject.profileIds),
        ),
      )
      .returning({ id: anonymousUserProfiles.id });

    if (tombstones.length !== subject.profileIds.length) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Visitor data changed during deletion. Try again.",
      });
    }
    return {
      success: true as const,
      erasedAt,
      deleted: {
        profiles: tombstones.length,
        sessions: sessions.length,
        events: events.length,
        webVitals: webVitals.length,
        formSubmissions: externalForms.length,
        mirroredFormSubmissions: mirroredForms.length,
      },
    };
  });
  removeRealtimeEventsForSubjects({
    anonymousIds: subject.anonymousIds,
    funnelIds: scopedFunnels.map((record) => record.id),
    userIds: subject.identifiedUserIds,
  });
  return result;
}
