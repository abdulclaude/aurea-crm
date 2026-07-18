import assert from "node:assert/strict";
import test from "node:test";

import { NOTIFICATION_TYPES } from "@/features/notifications/contracts";
import {
  EMAIL_NOTIFICATION_TYPES,
  getNotificationGroups,
  INSTRUCTOR_NOTIFICATION_TYPES,
  NOTIFICATION_EVENTS,
} from "@/features/notifications/settings-registry";

test("notification settings registry covers every runtime event exactly once", () => {
  const registeredTypes = NOTIFICATION_EVENTS.map((item) => item.type);

  assert.equal(new Set(registeredTypes).size, registeredTypes.length);
  assert.deepEqual([...registeredTypes].sort(), [...NOTIFICATION_TYPES].sort());
});

test("notification settings registry separates operator and instructor events", () => {
  const operatorTypes = getNotificationGroups("operator").flatMap((group) =>
    group.events.map((item) => item.type),
  );
  const instructorTypes = getNotificationGroups("instructor").flatMap((group) =>
    group.events.map((item) => item.type),
  );

  assert.equal(
    instructorTypes.every((type) => INSTRUCTOR_NOTIFICATION_TYPES.has(type)),
    true,
  );
  assert.equal(
    operatorTypes.some((type) => INSTRUCTOR_NOTIFICATION_TYPES.has(type)),
    false,
  );
  assert.equal(
    operatorTypes.length + instructorTypes.length,
    NOTIFICATION_TYPES.length,
  );
});

test("email-capable events are declared by the same registry", () => {
  assert.deepEqual(
    [...EMAIL_NOTIFICATION_TYPES].sort(),
    NOTIFICATION_EVENTS.filter((item) => item.supportsEmail)
      .map((item) => item.type)
      .sort(),
  );
});
