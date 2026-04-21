import type { AdmissionMode, Prisma } from "@prisma/client";

import type { Event, EventStatus } from "@/types/event";

export const LOCKED_EVENT_STATUSES = ["upcoming", "live", "past"] as const satisfies readonly EventStatus[];
export const PUBLIC_EVENT_STATUSES = ["live", "past"] as const satisfies readonly EventStatus[];
export const INTERNAL_PREVIEW_EVENT_STATUSES = ["upcoming", "live", "past"] as const satisfies readonly EventStatus[];
export const EVENT_ADMISSION_MODES = ["public", "curated"] as const satisfies readonly AdmissionMode[];
export const PUBLIC_ADMISSION_MODE = "public" as const satisfies AdmissionMode;
export const CURATED_ADMISSION_MODE = "curated" as const satisfies AdmissionMode;

export function isLockedEventStatus(status: EventStatus) {
  return (LOCKED_EVENT_STATUSES as readonly EventStatus[]).includes(status);
}

export function isPublicEventStatus(status: EventStatus) {
  return (PUBLIC_EVENT_STATUSES as readonly EventStatus[]).includes(status);
}

export function isInternalPreviewEventStatus(status: EventStatus) {
  return (INTERNAL_PREVIEW_EVENT_STATUSES as readonly EventStatus[]).includes(status);
}

export function isPublicAdmissionMode(admissionMode: AdmissionMode) {
  return admissionMode === PUBLIC_ADMISSION_MODE;
}

export function isCuratedAdmissionMode(admissionMode: AdmissionMode) {
  return admissionMode === CURATED_ADMISSION_MODE;
}

export function canConsumerAccessEvent(event: Event) {
  return isPublicEventStatus(event.status);
}

export function canRecruiterAccessEventPreview(event: Event) {
  return isInternalPreviewEventStatus(event.status);
}

export function getPublicEventCollection(events: Event[]) {
  return events.filter((event) => isPublicEventStatus(event.status));
}

export function getPublicEventWhereInput(): Prisma.EventWhereInput {
  return {
    status: {
      in: [...PUBLIC_EVENT_STATUSES],
    },
  };
}

export function getRecruiterInternalPreviewEventWhereInput(): Prisma.EventWhereInput {
  return {
    status: {
      in: [...INTERNAL_PREVIEW_EVENT_STATUSES],
    },
  };
}

export function getLockedEditorEventWhereInput(): Prisma.EventWhereInput {
  return {
    status: {
      in: [...LOCKED_EVENT_STATUSES],
    },
  };
}

export function getPublicAdmissionModeWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: PUBLIC_ADMISSION_MODE,
  };
}

export function getCuratedAdmissionModeWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: CURATED_ADMISSION_MODE,
  };
}

export function getPublicAdmissionPublicEventWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: PUBLIC_ADMISSION_MODE,
    status: {
      in: [...PUBLIC_EVENT_STATUSES],
    },
  };
}

export function getCuratedAdmissionPublicEventWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: CURATED_ADMISSION_MODE,
    status: {
      in: [...PUBLIC_EVENT_STATUSES],
    },
  };
}

export function getPublicAdmissionRecruiterPreviewEventWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: PUBLIC_ADMISSION_MODE,
    status: {
      in: [...INTERNAL_PREVIEW_EVENT_STATUSES],
    },
  };
}

export function getCuratedAdmissionRecruiterPreviewEventWhereInput(): Prisma.EventWhereInput {
  return {
    admissionMode: CURATED_ADMISSION_MODE,
    status: {
      in: [...INTERNAL_PREVIEW_EVENT_STATUSES],
    },
  };
}
