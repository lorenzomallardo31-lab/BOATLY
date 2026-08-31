export type TodayDashboardBoat = {
  id: string;
  name: string;
  status: string;
};

export type TodayDashboardItem = {
  id: string;
  boatId: string;
  kind: "BOOKING" | "BLOCK";
  startsAt: string;
  endsAt: string;
  completedAt?: string | null;
  customer: string | null;
  passengers: number | null;
  notes: string | null;
  customerPhone: string | null;
  operatorCustomerId: string | null;
  rawStatus?: string;
  skipperAssignmentState?: string | null;
  skipperName?: string | null;
  skipperPhone?: string | null;
};

export type TodayDashboardEvent = {
  id: string;
  itemId: string;
  boatId: string;
  at: string;
  kind: "DEPARTURE" | "RETURN" | "RETURNED" | "IN_USE" | "BLOCK";
};

export type TodayDashboardEventGroup = {
  id: string;
  at: string;
  events: TodayDashboardEvent[];
};

export type TodayDashboardAlert = {
  id: string;
  boatId: string;
  itemId: string;
  tone: "attention" | "danger";
  title: string;
  detail: string;
};

export type TodayDashboardOverview = {
  bookings: TodayDashboardItem[];
  blocks: TodayDashboardItem[];
  events: TodayDashboardEvent[];
  eventGroups: TodayDashboardEventGroup[];
  alerts: TodayDashboardAlert[];
  customerCount: number;
  missingPhoneCount: number;
  blockedBoatCount: number;
};

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildTodayDashboard(
  items: TodayDashboardItem[],
  boats: TodayDashboardBoat[],
  day: { start: string; end: string },
): TodayDashboardOverview {
  const dayStart = timestamp(day.start);
  const dayEnd = timestamp(day.end);
  if (dayStart === null || dayEnd === null || dayEnd <= dayStart) {
    return {
      bookings: [],
      blocks: [],
      events: [],
      eventGroups: [],
      alerts: [],
      customerCount: 0,
      missingPhoneCount: 0,
      blockedBoatCount: 0,
    };
  }

  const todayItems = items.filter((item) => {
    const startsAt = timestamp(item.startsAt);
    const endsAt = timestamp(item.endsAt);
    return startsAt !== null
      && endsAt !== null
      && startsAt < dayEnd
      && endsAt > dayStart;
  });
  const bookings = todayItems.filter((item) => item.kind === "BOOKING");
  const blocks = todayItems.filter((item) => item.kind === "BLOCK");
  const boatById = new Map(boats.map((boat) => [boat.id, boat]));

  const events: TodayDashboardEvent[] = [];
  for (const item of bookings) {
    const startsAt = timestamp(item.startsAt)!;
    const endsAt = timestamp(item.endsAt)!;
    let eventCount = 0;
    if (item.rawStatus === "COMPLETED") {
      const completedAt = timestamp(item.completedAt ?? item.endsAt) ?? endsAt;
      events.push({
        id: `${item.id}:returned`,
        itemId: item.id,
        boatId: item.boatId,
        at: completedAt < dayStart
          ? day.start
          : completedAt >= dayEnd
            ? new Date(dayEnd - 1).toISOString()
            : new Date(completedAt).toISOString(),
        kind: "RETURNED",
      });
      continue;
    }

    if (startsAt >= dayStart && startsAt < dayEnd && item.rawStatus !== "IN_PROGRESS") {
      events.push({
        id: `${item.id}:departure`,
        itemId: item.id,
        boatId: item.boatId,
        at: item.startsAt,
        kind: "DEPARTURE",
      });
      eventCount += 1;
    } else if (item.rawStatus === "IN_PROGRESS") {
      events.push({
        id: `${item.id}:in-use`,
        itemId: item.id,
        boatId: item.boatId,
        at: startsAt < dayStart ? day.start : item.startsAt,
        kind: "IN_USE",
      });
      eventCount += 1;
    }
    if (endsAt > dayStart && endsAt < dayEnd) {
      events.push({
        id: `${item.id}:return`,
        itemId: item.id,
        boatId: item.boatId,
        at: item.endsAt,
        kind: "RETURN",
      });
      eventCount += 1;
    }
    if (eventCount === 0) {
      events.push({
        id: `${item.id}:in-use`,
        itemId: item.id,
        boatId: item.boatId,
        at: day.start,
        kind: "IN_USE",
      });
    }
  }
  for (const item of blocks) {
    const startsAt = timestamp(item.startsAt)!;
    events.push({
      id: `${item.id}:block`,
      itemId: item.id,
      boatId: item.boatId,
      at: startsAt < dayStart ? day.start : item.startsAt,
      kind: "BLOCK",
    });
  }
  events.sort((left, right) => {
    const timeDifference = timestamp(left.at)! - timestamp(right.at)!;
    if (timeDifference !== 0) return timeDifference;
    const priority = { DEPARTURE: 0, IN_USE: 1, BLOCK: 2, RETURN: 3, RETURNED: 4 };
    return priority[left.kind] - priority[right.kind];
  });
  const eventGroups = groupTodayDashboardEvents(events);

  const alerts: TodayDashboardAlert[] = [];
  for (const booking of bookings) {
    const boat = boatById.get(booking.boatId);
    if (!booking.customerPhone) {
      alerts.push({
        id: `${booking.id}:phone`,
        boatId: booking.boatId,
        itemId: booking.id,
        tone: "attention",
        title: "Telefono non inserito",
        detail: `${booking.customer ?? "Cliente"} · ${boat?.name ?? "Imbarcazione"}`,
      });
    }
    if (boat && boat.status !== "ACTIVE") {
      alerts.push({
        id: `${booking.id}:inactive-boat`,
        boatId: booking.boatId,
        itemId: booking.id,
        tone: "danger",
        title: "Prenotazione su barca non disponibile",
        detail: boat.name,
      });
    }
    if (booking.skipperAssignmentState === "UNASSIGNED") {
      alerts.push({
        id: `${booking.id}:skipper`,
        boatId: booking.boatId,
        itemId: booking.id,
        tone: "attention",
        title: "Skipper da assegnare",
        detail: `${booking.customer ?? "Cliente"} · ${boat?.name ?? "Imbarcazione"}`,
      });
    }
  }

  for (const boat of boats) {
    const boatBookings = bookings
      .filter((booking) => booking.boatId === boat.id)
      .sort((left, right) => timestamp(left.startsAt)! - timestamp(right.startsAt)!);
    for (let index = 1; index < boatBookings.length; index += 1) {
      const previous = boatBookings[index - 1];
      const current = boatBookings[index];
      const turnaroundMinutes = Math.round(
        (timestamp(current.startsAt)! - timestamp(previous.endsAt)!) / 60_000,
      );
      if (turnaroundMinutes < 60) {
        alerts.push({
          id: `${previous.id}:${current.id}:turnaround`,
          boatId: boat.id,
          itemId: current.id,
          tone: turnaroundMinutes < 0 ? "danger" : "attention",
          title: turnaroundMinutes < 0 ? "Orari sovrapposti" : "Rientro e partenza ravvicinati",
          detail: `${boat.name} · ${Math.max(0, turnaroundMinutes)} min di intervallo`,
        });
      }
    }

    const boatBlocks = blocks.filter((block) => block.boatId === boat.id);
    if (boatBookings.length > 0 && boatBlocks.length > 0) {
      alerts.push({
        id: `${boat.id}:booking-block`,
        boatId: boat.id,
        itemId: boatBookings[0].id,
        tone: "danger",
        title: "Prenotazione e blocco nello stesso giorno",
        detail: `${boat.name} richiede un controllo`,
      });
    }
  }

  return {
    bookings,
    blocks,
    events,
    eventGroups,
    alerts,
    customerCount: new Set(
      bookings.map((booking) => booking.operatorCustomerId ?? booking.id),
    ).size,
    missingPhoneCount: bookings.filter((booking) => !booking.customerPhone).length,
    blockedBoatCount: new Set(blocks.map((block) => block.boatId)).size,
  };
}

export function groupTodayDashboardEvents(
  events: TodayDashboardEvent[],
): TodayDashboardEventGroup[] {
  const groups = new Map<string, TodayDashboardEvent[]>();

  for (const event of events) {
    const key = event.at;
    const current = groups.get(key);
    if (current) current.push(event);
    else groups.set(key, [event]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => timestamp(left)! - timestamp(right)!)
    .map(([at, groupedEvents]) => ({
      id: at,
      at,
      events: groupedEvents,
    }));
}
