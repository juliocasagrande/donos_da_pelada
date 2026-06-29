ALTER TABLE "Pelada"
ADD COLUMN "restrictGuestInviteTime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "guestInviteHour" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "deprioritizeGuestsInDraw" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Pelada"
ADD CONSTRAINT "Pelada_guestInviteHour_range" CHECK ("guestInviteHour" >= 0 AND "guestInviteHour" <= 23);
